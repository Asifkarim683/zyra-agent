import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill to handle greetings and time-aware welcome messages.
 */
export class GreetingSkill extends BaseSkill {
  name = 'greeting';
  description = 'Responds to greetings with time-aware responses';
  patterns: IntentPattern[] = [
    { pattern: /^(hello|hey|hi|good morning|good afternoon|good evening|hey zyra|hello zyra)/i, intent: 'greet' },
  ];

  /**
   * Executes the greeting response based on the current time of day.
   * @param context The skill context.
   * @returns The skill result with the greeting.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const hour = new Date().getHours();
    let timeGreeting = 'Hello';

    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    const response = `${timeGreeting}, ${config.ownerName}! How can I help you today?`;
    return this.success(response);
  }
}
