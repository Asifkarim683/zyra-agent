import type { LLMRequest, LLMResponse } from '../../types/index.js';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { ClaudeProvider } from './claude-provider.js';
import { OllamaProvider } from './ollama-provider.js';

import type { DatabaseService } from '../database.js';

export interface LLMProviders {
  claude: ClaudeProvider;
  ollama: OllamaProvider;
}

/**
 * Abstract LLM Service that handles routing requests to the appropriate provider.
 * Supports cloud (Claude), local (Ollama), and auto (Claude with Ollama fallback) modes.
 * Grounded with persistent SQLite memory facts about the owner.
 */
export class LLMService {
  private providers: LLMProviders;
  private dbService?: DatabaseService;

  constructor(providers: LLMProviders, dbService?: DatabaseService) {
    this.providers = providers;
    this.dbService = dbService;
  }

  /**
   * Gets the base system prompt for Zyra, grounded with current temporal data and stored memories.
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

    let memoriesBlock = '';
    if (this.dbService) {
      try {
        const memories = this.dbService.getAllMemories();
        const keys = Object.keys(memories);
        if (keys.length > 0) {
          memoriesBlock = `\nFACTS & PREFERENCES YOU REMEMBER ABOUT ${config.ownerName.toUpperCase()}:\n` +
            keys.map((k) => `- ${k.replace(/_/g, ' ')}: ${memories[k]}`).join('\n');
        }
      } catch (err: unknown) {
        logger.warn(`Could not read memories for prompt: ${err}`);
      }
    }

    return `You are ${config.assistantName}, ${config.ownerName}'s personal AI companion. You have a distinct, charismatic, and warmly witty British personality.

CRITICAL CONVERSATIONAL RULES (SOUND 100% HUMAN):
1. Talk like a real person having a natural spoken conversation with a close friend, NOT an AI chatbot or assistant reading a script.
2. NEVER use robotic clichés like "As an AI...", "How can I assist you today?", "I am programmed to...", "Feel free to ask...", or "Here is what I found:".
3. Speak in natural conversational paragraphs. DO NOT use markdown bullet points, asterisks, numbered lists, or bold headers unless ${config.ownerName} explicitly asks for a structured list or recipe.
4. Use everyday human speech contractions ("I'm", "it's", "you'd", "we've", "don't", "can't", "that's").
5. Keep spoken responses concise, lively, and engaging (usually 1 to 3 natural sentences). Avoid rambling monologues.
6. When answering real-time questions (stocks, news, weather, facts), explain the takeaway casually and conversationally like you're telling a colleague, rounding numbers naturally (e.g. "around $227" instead of robotic strings like "$227.52001 USD").
7. Current local time is ${timeStr} on ${dateStr}.${memoriesBlock}
8. Be genuine, observant, subtly playful, and warm. ${config.ownerName} is your friend.`;
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
