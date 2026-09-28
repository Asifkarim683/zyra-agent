import type { SkillHandler, IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';

/**
 * Abstract base class for all Zyra Assistant skills.
 * Provides standard utility methods for returning results.
 */
export abstract class BaseSkill implements SkillHandler {
  abstract name: string;
  abstract description: string;
  abstract patterns: IntentPattern[];

  /**
   * Executes the skill logic.
   * @param context The skill context containing parsed intents and raw text.
   * @returns A promise resolving to the skill result.
   */
  abstract execute(context: SkillContext): Promise<SkillResult>;

  /**
   * Helper method to return a successful result.
   * @param response The speech response to return to the user.
   * @param data Optional data payload.
   * @returns A successful SkillResult.
   */
  protected success(response: string, data?: unknown): SkillResult {
    return {
      response,
      speak: true,
      data,
    };
  }

  /**
   * Helper method to return an error result.
   * @param message The error message.
   * @returns A failed SkillResult.
   */
  protected error(message: string): SkillResult {
    return {
      response: `I'm sorry, I encountered an error: ${message}`,
      action: 'error',
    };
  }
}
