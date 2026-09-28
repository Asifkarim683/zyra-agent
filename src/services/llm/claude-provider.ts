import Anthropic from '@anthropic-ai/sdk';
import type { LLMRequest, LLMResponse, ConversationTurn } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';

/**
 * Provider for Anthropic's Claude API.
 */
export class ClaudeProvider {
  private client: Anthropic;
  private defaultModel = 'claude-sonnet-4-20250514';

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropicApiKey || '',
    });
  }

  /**
   * Executes a chat completion request using Claude.
   * @param request The chat request parameters.
   * @returns The generated response.
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      logger.debug('Sending request to Claude provider', { model: this.defaultModel });

      const messages: Anthropic.MessageParam[] = request.messages.map((turn: ConversationTurn) => ({
        role: turn.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: turn.content,
      }));

      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: request.maxTokens || 1024,
        system: request.systemPrompt,
        messages,
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';

      return {
        content: text,
        provider: 'claude',
        tokensUsed: response.usage?.output_tokens,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Claude provider error', { error: msg });
      throw new Error(`Claude API failure: ${msg}`);
    }
  }
}
