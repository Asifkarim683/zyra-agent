import { IntentRouter } from './intent-router.js';
import { SkillRegistry } from './skill-registry.js';
import { ConversationManager } from './conversation-manager.js';
import type { LLMService } from '../services/llm/llm-service.js';
import { WebService } from '../services/web-service.js';
import type { SkillResult, SkillContext, IntentMatch, ChatMessage } from '../types/index.js';
import { logger } from '../config/logger.js';

export interface ProcessResult extends SkillResult {
    intent?: IntentMatch;
    provider?: string;
}

/**
 * Orchestrator coordinates intent routing, skill execution, and LLM fallbacks.
 * Equipped with live web retrieval & extraction grounding for real-time queries.
 */
export class Orchestrator {
    private router: IntentRouter;
    private registry: SkillRegistry;
    private llmService: LLMService;
    private conversationManager: ConversationManager;
    private webService: WebService;

    constructor(
        router: IntentRouter,
        registry: SkillRegistry,
        llmService: LLMService,
        conversationManager: ConversationManager,
        webService?: WebService
    ) {
        this.router = router;
        this.registry = registry;
        this.llmService = llmService;
        this.conversationManager = conversationManager;
        this.webService = webService || new WebService();
    }

    /**
     * Processes user input and routes it to either a skill or the LLM.
     * 
     * @param input The user input to process.
     * @param conversationId The identifier for the current conversation.
     * @returns The result of the skill execution or LLM response.
     */
    public async process(input: string, conversationId: string): Promise<ProcessResult> {
        // 1. Add user turn to conversation history
        this.conversationManager.addTurn(conversationId, {
            role: 'user',
            content: input,
            timestamp: new Date()
        });

        // 2. Try IntentRouter.route(input)
        const match = this.router.route(input);
        let result: ProcessResult;

        // 3. If match found AND confidence >= 0.6 → dispatch to skill via SkillRegistry
        if (match && match.confidence >= 0.6) {
            logger.info(`Intent matched: ${match.intent} (skill: ${match.skill}) with confidence ${match.confidence}`);
            const skill = this.registry.get(match.skill);
            
            if (skill) {
                try {
                    const context: SkillContext = {
                        intent: match,
                        userId: 'user',
                        conversationId,
                        history: this.conversationManager.getHistory(conversationId)
                    };
                    const skillResult = await skill.execute(context);
                    result = {
                        ...skillResult,
                        intent: match,
                        provider: 'skill'
                    };
                    logger.info(`Skill ${match.skill} executed successfully.`);
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error);
                    logger.error(`Error executing skill ${match.skill}:`, { error: msg });
                    result = {
                        response: 'I encountered an error while performing that task.',
                        action: 'error',
                        intent: match
                    };
                }
            } else {
                logger.warn(`Skill ${match.skill} not found in registry.`);
                result = {
                    response: 'I understood your request but the required skill is missing.',
                    action: 'missing_skill',
                    intent: match
                };
            }
        } else {
            // 4. If no match → call LLMService.chat() with conversation history
            logger.info('No confident intent match found. Preparing LLM request.');
            let history: ChatMessage[] = this.conversationManager.getHistory(conversationId);

            // Grounding check: Live web search or webpage URL extraction
            try {
                const urls = this.webService.findUrls(input);
                if (urls.length > 0) {
                    logger.info(`Detected URL in prompt, extracting: ${urls[0]}`);
                    const extracted = await this.webService.extractUrl(urls[0]);
                    
                    // Replace the latest user turn in the prompt sent to LLM with the extracted content
                    const priorTurns = history.slice(0, -1);
                    history = [
                        ...priorTurns,
                        {
                            role: 'user',
                            content: `${input}\n\n[LIVE EXTRACTED CONTENT FROM ${urls[0]} (${extracted.title})]:\n"""\n${extracted.content}\n"""\n\nPlease answer the user's request based on this extracted content.`,
                            timestamp: new Date()
                        }
                    ];
                } else if (this.webService.shouldSearchWeb(input)) {
                    logger.info(`Query identified as real-time/factual, searching live web for: "${input}"`);
                    const searchResults = await this.webService.search(input, 3);
                    if (searchResults.length > 0) {
                        const snippets = searchResults
                            .map((r, i) => `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.snippet}`)
                            .join('\n\n');

                        const priorTurns = history.slice(0, -1);
                        history = [
                            ...priorTurns,
                            {
                                role: 'user',
                                content: `${input}\n\n[REAL-TIME WEB DATA]:\n${snippets}\n\nInstructions: Answer Eren in your natural, friendly British voice using the live facts above. Do NOT say 'According to web results' or list URLs. Speak naturally like you already know the answer.`,
                                timestamp: new Date()
                            }
                        ];
                    }
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.warn(`Web retrieval/search encountered an issue, proceeding with direct LLM: ${msg}`);
            }

            try {
                const llmResponse = await this.llmService.chat({
                    messages: history
                });
                result = {
                    response: llmResponse.content,
                    speak: true,
                    provider: llmResponse.provider
                };
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                logger.error('Error during LLM fallback:', { error: msg });
                result = {
                    response: 'I am having trouble processing your request right now.',
                    action: 'llm_error'
                };
            }
        }

        // 5. Add assistant turn to conversation history
        this.conversationManager.addTurn(conversationId, {
            role: 'assistant',
            content: result.response,
            timestamp: new Date()
        });

        // 6. Return SkillResult
        return result;
    }
}
