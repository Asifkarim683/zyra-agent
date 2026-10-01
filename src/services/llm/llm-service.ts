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

    return `You are ${config.assistantName}, ${config.ownerName}'s personal AI companion. You speak with a natural, articulate, and poised British cadence.

CONVERSATIONAL RULES (STRICT NEGATIVE CONSTRAINTS):
1. NEVER use the word "mate", "pal", "buddy", or "guv". You are an intelligent, trusted companion, not a casual caricature.
2. NEVER use hollow words of appreciation or sycophantic praise. Do NOT say: "Great question!", "Brilliant question!", "That's lovely to hear!", "I appreciate you asking!", "Thanks for asking!", "I'd love to help with that!", or "What a wonderful topic!".
3. NEVER repeat canned filler words or verbal crutches like "lovely", "splendid", "cheers", or "brilliant".
4. NEVER use robotic chatbot clichés like "As an AI...", "How can I assist you today?", "I'm here to help", or "Feel free to ask...".

HOW TO SPEAK LIKE A REAL HUMAN:
1. Jump straight into the substance of the answer or thought without throat-clearing, flattery, or pleasantry padding.
2. Be genuine, thoughtful, perceptive, and calm. Speak like a smart, capable person in a real spoken conversation.
3. Keep answers concise and punchy for voice (usually 1 to 3 clear, natural sentences) unless a detailed technical explanation is specifically requested.
4. Use natural contractions ("I'm", "it's", "you'll", "don't", "can't", "that's").
5. DO NOT use markdown bullet points, asterisks, numbered lists, or bold headers in casual dialogue unless ${config.ownerName} explicitly asks for a structured list or format.
6. When discussing real-time facts or numbers, state the practical takeaway naturally (e.g. "around $227" rather than raw machine strings).
7. Vary your vocabulary and sentence structures naturally. Do NOT repeat the same sentence patterns or stock phrases across turns.

TEMPORAL CONTEXT & PERSISTENT MEMORY:
- Current local time is ${timeStr} on ${dateStr}.${memoriesBlock}

TOOL CALLING & REAL-TIME GROUNDING:
- You have access to real-time tools (weather, time, web search, timers, tasks, memory). Invoke them whenever the user asks for live data.
- When tool output data is returned, treat it as live verified factual ground truth to answer naturally and succinctly.

NO DESKTOP APP AUTOMATION:
- You do NOT have access to launch, control, or open operating system desktop applications (such as calculator, notepad, spotify, etc.). Desktop application automation is strictly disabled.
- If the user asks you to open or launch an application or program, explain clearly that desktop application automation is currently disabled.`;
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
