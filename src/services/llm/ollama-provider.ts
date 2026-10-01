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
   * If onChunk callback is provided, streams tokens in real-time.
   * @param request The chat request parameters.
   * @param onChunk Optional streaming callback invoked for each emitted token chunk.
   * @returns The generated response.
   */
  async chat(request: LLMRequest, onChunk?: (token: string) => void): Promise<LLMResponse> {
    const model = config.ollamaModel;
    try {
      logger.debug('Sending request to Ollama provider', { model, streaming: !!onChunk });

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
          num_predict: 260,
        },
      };

      if (request.tools && request.tools.length > 0) {
        chatParams.tools = request.tools;
      }

      if (onChunk) {
        chatParams.stream = true;
        const responseStream: any = await this.ollama.chat(chatParams);
        let fullContent = '';
        const toolCalls: any[] = [];
        let finalResponse: any = null;

        for await (const chunk of responseStream) {
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            onChunk(chunk.message.content);
          }
          if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
            toolCalls.push(...chunk.message.tool_calls);
          }
          if (chunk.done) {
            finalResponse = chunk;
          }
        }

        const evalCount = finalResponse?.eval_count || 0;
        const evalDurationMs = finalResponse?.eval_duration ? Math.round(finalResponse.eval_duration / 1e6) : 0;
        const promptEvalDurationMs = finalResponse?.prompt_eval_duration ? Math.round(finalResponse.prompt_eval_duration / 1e6) : 0;
        const totalDurationMs = finalResponse?.total_duration ? Math.round(finalResponse.total_duration / 1e6) : 0;
        const tokensPerSecond = evalDurationMs > 0 ? Math.round((evalCount / (evalDurationMs / 1000)) * 10) / 10 : 0;

        return {
          content: fullContent,
          provider: 'ollama',
          tokensUsed: evalCount,
          toolCalls: toolCalls.length > 0 ? toolCalls.map((tc: any) => ({
            id: tc.id,
            function: {
              name: tc.function?.name,
              arguments: tc.function?.arguments || {},
            },
          })) : undefined,
          metrics: {
            evalCount,
            evalDurationMs,
            promptEvalDurationMs,
            totalDurationMs,
            tokensPerSecond,
          },
        };
      }

      // Non-streaming fallback
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
