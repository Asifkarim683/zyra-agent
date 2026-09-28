import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill to handle greetings with human-like warmth and conversational variety.
 */
export class GreetingSkill extends BaseSkill {
  name = 'greeting';
  description = 'Responds to greetings with warm, natural conversational messages';
  patterns: IntentPattern[] = [
    { pattern: /^(hello|hey|hi|good morning|good afternoon|good evening|hey zyra|hello zyra|hi zyra)/i, intent: 'greet' },
  ];

  /**
   * Executes a warm, natural greeting based on time of day.
   */
  async execute(_context: SkillContext): Promise<SkillResult> {
    const hour = new Date().getHours();
    let greetings: string[];

    if (hour < 12) {
      greetings = [
        `Good morning, ${config.ownerName}. What are we tackling today?`,
        `Morning, ${config.ownerName}. How's everything going with you?`,
        `Good morning, ${config.ownerName}. Ready when you are. What's on your mind?`,
      ];
    } else if (hour < 18) {
      greetings = [
        `Good afternoon, ${config.ownerName}. How's your day shaping up?`,
        `Hey ${config.ownerName}. Hope things are running smoothly. What's on your mind?`,
        `Afternoon, ${config.ownerName}. What are you working on right now?`,
      ];
    } else {
      greetings = [
        `Good evening, ${config.ownerName}. How did everything go today?`,
        `Evening, ${config.ownerName}. Winding down, or still getting things done?`,
        `Hey ${config.ownerName}. Hope you've had a solid day. What's on your mind?`,
      ];
    }

    const response = greetings[Math.floor(Math.random() * greetings.length)];
    return this.success(response);
  }
}
