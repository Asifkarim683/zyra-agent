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

      const messages: any[] = request.messages.map((turn: ConversationTurn) => {
        const msg: any = {
          role: turn.role,
          content: turn.content,
        };
        if (turn.tool_calls) {
          msg.tool_calls = turn.tool_calls;
        }
        return msg;
      });

      if (request.systemPrompt) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const chatParams: any = {
        model,
        messages,
        options: {
          temperature: 0.6,
          repeat_penalty: 1.18,
          frequency_penalty: 0.25,
        },
      };

      if (request.tools && request.tools.length > 0) {
        chatParams.tools = request.tools;
      }

      const response: any = await this.ollama.chat(chatParams);

      const evalCount = response.eval_count || 0;
      const evalDurationMs = response.eval_duration ? Math.round(response.eval_duration / 1e6) : 0;
      const promptEvalDurationMs = response.prompt_eval_duration ? Math.round(response.prompt_eval_duration / 1e6) : 0;
      const totalDurationMs = response.total_duration ? Math.round(response.total_duration / 1e6) : 0;
      const tokensPerSecond = evalDurationMs > 0 ? Math.round((evalCount / (evalDurationMs / 1000)) * 10) / 10 : 0;

      return {
        content: response.message.content || '',
        provider: 'ollama',
        tokensUsed: evalCount,
        toolCalls: response.message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          function: {
            name: tc.function?.name,
            arguments: tc.function?.arguments || {},
          },
        })),
        metrics: {
          evalCount,
          evalDurationMs,
          promptEvalDurationMs,
          totalDurationMs,
          tokensPerSecond,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Ollama provider error', { error: msg });
      throw new Error(`Ollama failure (is it running?): ${msg}`);
    }
  }
}
