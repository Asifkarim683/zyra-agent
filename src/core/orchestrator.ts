import { IntentRouter } from './intent-router.js';
import { SkillRegistry } from './skill-registry.js';
import { ConversationManager } from './conversation-manager.js';
import type { LLMService } from '../services/llm/llm-service.js';
import type { SkillResult, SkillContext, IntentMatch } from '../types/index.js';
import { logger } from '../config/logger.js';

export interface ProcessResult extends SkillResult {
    intent?: IntentMatch;
    provider?: string;
}

/**
 * Orchestrator coordinates intent routing, skill execution, and LLM fallbacks.
 */
export class Orchestrator {
    private router: IntentRouter;
    private registry: SkillRegistry;
    private llmService: LLMService;
    private conversationManager: ConversationManager;

    constructor(
        router: IntentRouter,
        registry: SkillRegistry,
        llmService: LLMService,
        conversationManager: ConversationManager
    ) {
        this.router = router;
        this.registry = registry;
        this.llmService = llmService;
        this.conversationManager = conversationManager;
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
            logger.info('No confident intent match found. Falling back to LLM.');
            const history = this.conversationManager.getHistory(conversationId);
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
