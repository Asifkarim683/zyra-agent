import { IntentRouter } from './intent-router.js';
import { SkillRegistry } from './skill-registry.js';
import { ConversationManager } from './conversation-manager.js';
import type { LLMService } from '../services/llm/llm-service.js';
import { WebService } from '../services/web-service.js';
import type { TelemetryService } from '../services/telemetry-service.js';
import type { DatabaseService } from '../services/database.js';
import { PipelineTracer, type PipelineTrace } from './pipeline-tracer.js';
import { TOOL_SCHEMAS, executeTool } from './tools.js';
import type { SkillResult, SkillContext, IntentMatch, ConversationTurn } from '../types/index.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

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

  constructor(
    router: IntentRouter,
    registry: SkillRegistry,
    llmService: LLMService,
    conversationManager: ConversationManager,
    webService?: WebService,
    telemetryService?: TelemetryService,
    databaseService?: DatabaseService
  ) {
    this.router = router;
    this.registry = registry;
    this.llmService = llmService;
    this.conversationManager = conversationManager;
    this.webService = webService || new WebService();
    this.telemetryService = telemetryService;
    this.databaseService = databaseService;
  }

  /**
   * Processes user input through the model network execution graph.
   *
   * @param input The user prompt to process.
   * @param conversationId The identifier for the current conversation.
   * @returns The result of execution alongside the complete node pipeline trace.
   */
  public async process(input: string, conversationId: string): Promise<ProcessResult> {
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

      // ── Node 4: LLM Reasoning & Tool Planner Node ─────────────────────────
      tracer.startNode('node_reasoning', 'LLM Tool Planner & Reasoning', 'reasoning', {
        model: config.ollamaModel,
        provider: config.llmMode,
        toolsAvailable: TOOL_SCHEMAS.map((t) => t.function.name),
      });

      try {
        const initialLLMRes = await this.llmService.chat({
          messages: history,
          tools: TOOL_SCHEMAS,
        });

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
          const toolResults: Array<{ name: string; args: any; output: string }> = [];

          for (let i = 0; i < initialLLMRes.toolCalls.length; i++) {
            const tc = initialLLMRes.toolCalls[i];
            const toolNodeId = `node_tool_${tc.function.name}_${i}`;
            tracer.startNode(toolNodeId, `Tool Execution: ${tc.function.name}`, 'tool', tc.function.arguments);

            const toolRes = await executeTool(tc.function.name, tc.function.arguments, {
              registry: this.registry,
              dbService: this.databaseService,
              webService: this.webService,
              conversationId,
            });

            toolResults.push({
              name: tc.function.name,
              args: tc.function.arguments,
              output: toolRes.result,
            });

            tracer.endNode(toolNodeId, { result: toolRes.result });
          }

          // ── Node 6: Response Synthesis Node ─────────────────────────────────
          tracer.startNode('node_synthesis', 'Response Synthesis', 'synthesis', {
            toolsApplied: toolResults.map((t) => t.name),
          });

          // Build synthesis turn history with assistant's tool call and tool responses
          const synthesisMessages: ConversationTurn[] = [
            ...history,
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

          const synthesisRes = await this.llmService.chat({
            messages: synthesisMessages,
          });

          tracer.endNode(
            'node_synthesis',
            {
              content: synthesisRes.content,
            },
            {
              metrics: synthesisRes.metrics,
            }
          );

          result = {
            response: synthesisRes.content,
            provider: synthesisRes.provider,
            speak: true,
          };
        } else {
          // Direct LLM conversational answer (no tools required)
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
