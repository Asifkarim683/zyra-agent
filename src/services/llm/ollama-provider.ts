import { Ollama } from 'ollama';
import type { LLMRequest, LLMResponse, ConversationTurn } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';

/**
 * Provider for local Ollama instances.
 */
export class OllamaProvider {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: config.ollamaBaseUrl });
  }

  /**
   * Executes a chat completion request using Ollama.
   * @param request The chat request parameters.
   * @returns The generated response.
   */
  async chat(request: LLMRequest): Promise<LLMResponse> {
    const model = config.ollamaModel;
    try {
      logger.debug('Sending request to Ollama provider', { model });

      const messages: Array<{ role: string; content: string }> = request.messages.map((turn: ConversationTurn) => ({
        role: turn.role === 'user' ? 'user' : 'assistant',
        content: turn.content,
      }));

      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const response = await this.ollama.chat({
        model,
        messages,
        options: {
          temperature: 0.7,
          repeat_penalty: 1.18,
          frequency_penalty: 0.25,
        },
      });

      return {
        content: response.message.content,
        provider: 'ollama',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Ollama provider error', { error: msg });
      throw new Error(`Ollama failure (is it running?): ${msg}`);
    }
  }
}
