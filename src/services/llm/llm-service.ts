import type { LLMRequest, LLMResponse } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { ClaudeProvider } from './claude-provider.js';
import { OllamaProvider } from './ollama-provider.js';

export interface LLMProviders {
  claude: ClaudeProvider;
  ollama: OllamaProvider;
}

/**
 * Abstract LLM Service that handles routing requests to the appropriate provider.
 * Supports cloud (Claude), local (Ollama), and auto (Claude with Ollama fallback) modes.
 */
export class LLMService {
  private providers: LLMProviders;

  constructor(providers: LLMProviders) {
    this.providers = providers;
  }

  /**
   * Gets the base system prompt for Zyra.
   * @returns The formatted system prompt.
   */
  private getSystemPrompt(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: 'short',
    });

    return `You are ${config.assistantName}, a personal AI assistant for ${config.ownerName}. You are helpful, concise, and slightly witty. You speak naturally and warmly.
Current Date: ${dateStr}. Current Time: ${timeStr}.
When real-time information or web search results are provided in the context, use them directly to provide accurate, up-to-date answers. When you don't know something, say so honestly. You can help with general questions, conversations, and tasks.`;
  }

  /**
   * Executes a chat completion request using the configured strategy.
   * @param request The chat request parameters.
   * @returns The generated response.
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const mode = config.llmMode;
    const enhancedRequest: LLMRequest = {
      ...request,
      systemPrompt: request.systemPrompt || this.getSystemPrompt(),
    };

    logger.info(`LLMService chat requested with mode: ${mode}`);

    try {
      if (mode === 'cloud') {
        logger.info('Using Claude provider (cloud mode)');
        return await this.providers.claude.chat(enhancedRequest);
      } else if (mode === 'local') {
        logger.info('Using Ollama provider (local mode)');
        return await this.providers.ollama.chat(enhancedRequest);
      } else {
        // 'auto' mode — try Claude first, fallback to Ollama
        try {
          logger.info('Attempting Claude provider (auto mode)');
          return await this.providers.claude.chat(enhancedRequest);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`Claude failed, failing over to Ollama: ${msg}`);
          return await this.providers.ollama.chat(enhancedRequest);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`LLMService failed to complete request: ${msg}`);
      throw error;
    }
  }
}
