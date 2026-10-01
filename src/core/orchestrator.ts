import { IntentRouter } from './intent-router.js';
import { SkillRegistry } from './skill-registry.js';
import { ConversationManager } from './conversation-manager.js';
import type { LLMService } from '../services/llm/llm-service.js';
import { WebService } from '../services/web-service.js';
import type { TelemetryService } from '../services/telemetry-service.js';
import type { DatabaseService } from '../services/database.js';
import type { RAGService } from '../services/rag-service.js';
import { PipelineTracer, type PipelineTrace } from './pipeline-tracer.js';
import { TOOL_SCHEMAS, executeTool, getToolsForPrompt } from './tools.js';
import type { SkillResult, SkillContext, IntentMatch, ConversationTurn } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export interface ProcessCallbacks {
  onToken?: (token: string) => void;
  onStatus?: (status: string) => void;
}

export interface ProcessResult extends SkillResult {
  intent?: IntentMatch;
  provider?: string;
  trace?: PipelineTrace;
}

/**
 * Orchestrator coordinates intent routing, native tool calling, and LLM reasoning.
 * Instruments each step as an observable node in the model network execution graph.
 */
export class Orchestrator {
  private router: IntentRouter;
  private registry: SkillRegistry;
  private llmService: LLMService;
  private conversationManager: ConversationManager;
  private webService: WebService;
  private telemetryService?: TelemetryService;
  private databaseService?: DatabaseService;
  private ragService?: RAGService;

  constructor(
    router: IntentRouter,
    registry: SkillRegistry,
    llmService: LLMService,
    conversationManager: ConversationManager,
    webService?: WebService,
    telemetryService?: TelemetryService,
    databaseService?: DatabaseService,
    ragService?: RAGService
  ) {
    this.router = router;
    this.registry = registry;
    this.llmService = llmService;
    this.conversationManager = conversationManager;
    this.webService = webService || new WebService();
    this.telemetryService = telemetryService;
    this.databaseService = databaseService;
    this.ragService = ragService;
  }

  /**
   * Processes user input through the model network execution graph.
   *
   * @param input The user prompt to process.
   * @param conversationId The identifier for the current conversation.
   * @param callbacks Optional callbacks for real-time token streaming and status updates.
   * @returns The result of execution alongside the complete node pipeline trace.
   */
  public async process(
    input: string,
    conversationId: string,
    callbacks?: ProcessCallbacks
  ): Promise<ProcessResult> {
    const tracer = new PipelineTracer(input);

    // ── Node 1: Ingestion & Safety Node ────────────────────────────────────
    tracer.startNode('node_ingest', 'Input & Safety Ingestion', 'ingestion', {
      prompt: input,
      length: input.length,
    });
    const sanitizedInput = input.trim();
    tracer.endNode('node_ingest', { sanitized: sanitizedInput, status: 'valid' });

    // ── Node 2: Context & Memory Retrieval Node ────────────────────────────
    tracer.startNode('node_context', 'Memory & Context Retrieval', 'memory');
    this.conversationManager.addTurn(conversationId, {
      role: 'user',
      content: sanitizedInput,
      timestamp: new Date(),
    });

    let history: ConversationTurn[] = this.conversationManager.getHistory(conversationId);
    let memoriesCount = 0;
    let semanticMatches: string[] = [];

    if (this.ragService) {
      try {
        const matches = await this.ragService.searchSemanticMemories(sanitizedInput, 2, 0.52);
        if (matches.length > 0) {
          semanticMatches = matches.map((m) => `${m.key}: ${m.value}`);
        }
      } catch {
        // Fall back gracefully if embeddings offline
      }
    }

    if (this.databaseService) {
      try {
        const memories = this.databaseService.getAllMemories();
        memoriesCount = Object.keys(memories).length;
      } catch {
        // Continue if DB unavailable
      }
    }
    tracer.endNode('node_context', {
      historyTurns: history.length,
      memoriesLoaded: memoriesCount,
      semanticMatchesLoaded: semanticMatches.length,
    });

    let result: ProcessResult;

    // ── Node 3: Fast-Path Deterministic Router ──────────────────────────────
    tracer.startNode('node_router', 'Fast-Path Intent Router', 'router');
    const match = this.router.route(sanitizedInput);

    // If high confidence deterministic match, execute fast-path (e.g. single-word stop, exact time query)
    if (match && match.confidence >= 0.8) {
      logger.info(`Fast-path matched: ${match.intent} (skill: ${match.skill}) with confidence ${match.confidence}`);
      tracer.endNode('node_router', { matched: true, skill: match.skill, intent: match.intent });

      const skill = this.registry.get(match.skill);
      if (skill) {
        tracer.startNode('node_skill', `Direct Skill Execution: ${match.skill}`, 'tool', { intent: match.intent });
        try {
          const context: SkillContext = {
            intent: match,
            userId: 'user',
            conversationId,
            history: this.conversationManager.getHistory(conversationId),
          };
          const skillResult = await skill.execute(context);
          if (callbacks?.onToken && skillResult.response) {
            callbacks.onToken(skillResult.response);
          }
          result = {
            ...skillResult,
            intent: match,
            provider: 'skill',
          };
          tracer.endNode('node_skill', { response: skillResult.response, action: skillResult.action });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`Error executing skill ${match.skill}:`, { error: msg });
          tracer.endNode('node_skill', { error: msg }, undefined, 'error');
          result = {
            response: 'I encountered an error while performing that task.',
            action: 'error',
            intent: match,
          };
        }
      } else {
        tracer.endNode('node_skill', { error: 'Skill not found in registry' }, undefined, 'error');
        result = {
          response: 'I understood your request but the required skill is missing.',
          action: 'missing_skill',
          intent: match,
        };
      }
    } else {
      tracer.endNode('node_router', { matched: false, reason: 'Delegating to Autonomous Tool Calling' });

      // Keep active prompt context focused to the last 6 turns to keep prompt eval <100ms
      const promptHistory = history.slice(-6);
      if (semanticMatches.length > 0) {
        promptHistory.unshift({
          role: 'system',
          content: `Relevant personal memories about Eren:\n${semanticMatches.join('\n')}`,
          timestamp: new Date(),
        });
      }

      // Intelligently gate tool schemas: only pass tools if the user prompt actually requires them
      const candidateTools = getToolsForPrompt(sanitizedInput);
      const hasTools = candidateTools.length > 0;

      // ── Node 4: LLM Reasoning & Tool Planner Node ─────────────────────────
      tracer.startNode(
        'node_reasoning',
        hasTools ? 'LLM Tool Planner & Reasoning' : 'LLM Conversational Reasoning',
        'reasoning',
        {
          model: config.ollamaModel,
          provider: config.llmMode,
          toolsAvailable: candidateTools.map((t) => t.function.name),
        }
      );

      try {
        if (!hasTools) {
          // Direct conversational path: stream tokens immediately to user without tool evaluation latency
          const initialLLMRes = await this.llmService.chat(
            {
              messages: promptHistory,
            },
            callbacks?.onToken
          );

          tracer.endNode(
            'node_reasoning',
            {
              decision: 'direct_response',
              content: initialLLMRes.content,
            },
            {
              metrics: initialLLMRes.metrics,
            }
          );

          result = {
            response: initialLLMRes.content,
            provider: initialLLMRes.provider,
            speak: true,
          };
        } else {
          // Tool path: evaluate with relevant tool subset
          callbacks?.onStatus?.('Planning tools...');
          let bufferedTokens = '';
          const initialLLMRes = await this.llmService.chat(
            {
              messages: promptHistory,
              tools: candidateTools,
            },
            (token: string) => {
              bufferedTokens += token;
            }
          );

          // Check if LLM decided to invoke one or more tools
          if (initialLLMRes.toolCalls && initialLLMRes.toolCalls.length > 0) {
            tracer.endNode(
              'node_reasoning',
              {
                decision: 'tool_call',
                toolCalls: initialLLMRes.toolCalls,
              },
              {
                metrics: initialLLMRes.metrics,
              }
            );

            // ── Node 5: Tool Execution Node(s) ──────────────────────────────────
            const toolResults: Array<{ name: string; args: any; output: string; data?: any }> = [];

            for (let i = 0; i < initialLLMRes.toolCalls.length; i++) {
              const tc = initialLLMRes.toolCalls[i];
              const toolNodeId = `node_tool_${tc.function.name}_${i}`;
              tracer.startNode(toolNodeId, `Tool Execution: ${tc.function.name}`, 'tool', tc.function.arguments);
              callbacks?.onStatus?.(`Executing live tool: ${tc.function.name}...`);

              const toolRes = await executeTool(tc.function.name, tc.function.arguments, {
                registry: this.registry,
                dbService: this.databaseService,
                webService: this.webService,
                ragService: this.ragService,
                conversationId,
              });

              toolResults.push({
                name: tc.function.name,
                args: tc.function.arguments,
                output: toolRes.result,
                data: toolRes.data,
              });

              tracer.endNode(toolNodeId, { result: toolRes.result });
            }

            // ── Node 6: Response Synthesis Node ─────────────────────────────────
            tracer.startNode('node_synthesis', 'Response Synthesis', 'synthesis', {
              toolsApplied: toolResults.map((t) => t.name),
            });
            callbacks?.onStatus?.('Synthesizing verified response...');

            // Build synthesis turn history with assistant's tool call and tool responses
            const synthesisMessages: ConversationTurn[] = [
              ...promptHistory,
              {
                role: 'assistant',
                content: initialLLMRes.content || '',
                tool_calls: initialLLMRes.toolCalls.map((tc) => ({
                  id: tc.id || `call_${tc.function.name}`,
                  type: 'function',
                  function: tc.function,
                })),
                timestamp: new Date(),
              },
              ...toolResults.map((tr) => ({
                role: 'tool' as const,
                content: tr.output,
                tool_call_id: `call_${tr.name}`,
                timestamp: new Date(),
              })),
            ];

            const synthesisRes = await this.llmService.chat(
              {
                messages: synthesisMessages,
              },
              callbacks?.onToken
            );

            tracer.endNode(
              'node_synthesis',
              {
                content: synthesisRes.content,
              },
              {
                metrics: synthesisRes.metrics,
              }
            );

            const toolData = toolResults.reduce<Record<string, any>>((acc, tr) => {
              if (tr.data) Object.assign(acc, tr.data);
              return acc;
            }, {});

            result = {
              response: synthesisRes.content,
              provider: synthesisRes.provider,
              speak: true,
              data: Object.keys(toolData).length > 0 ? toolData : undefined,
            };
          } else {
            // Direct LLM conversational answer (no tools required)
            if (callbacks?.onToken && bufferedTokens) {
              callbacks.onToken(bufferedTokens);
            }

            tracer.endNode(
              'node_reasoning',
              {
                decision: 'direct_response',
                content: initialLLMRes.content,
              },
              {
                metrics: initialLLMRes.metrics,
              }
            );

            result = {
              response: initialLLMRes.content,
              provider: initialLLMRes.provider,
              speak: true,
            };
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('Error during LLM reasoning / tool calling:', { error: msg });
        tracer.endNode('node_reasoning', { error: msg }, undefined, 'error');

        result = {
          response: 'I am having trouble processing your request right now.',
          action: 'llm_error',
        };
      }
    }

    // ── Node 7: Hardware Telemetry & Trace Seal ──────────────────────────────
    let hardwareTelemetry;
    if (this.telemetryService) {
      try {
        hardwareTelemetry = await this.telemetryService.getHardwareTelemetry();
      } catch {
        // Non-critical telemetry failure
      }
    }

    const trace = tracer.completeTrace(
      hardwareTelemetry
        ? {
            gpuName: hardwareTelemetry.gpuName,
            gpuVramUsedMB: hardwareTelemetry.gpuVramUsedMB,
            gpuVramTotalMB: hardwareTelemetry.gpuVramTotalMB,
            gpuVramPercent: hardwareTelemetry.gpuVramPercent,
            systemMemoryPercent: hardwareTelemetry.systemMemoryPercent,
          }
        : undefined
    );

    if (this.telemetryService) {
      this.telemetryService.recordTrace(trace);
    }

    result.trace = trace;

    // 8. Add assistant turn to conversation history
    this.conversationManager.addTurn(conversationId, {
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
    });

    return result;
  }
}
