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
        `Good morning, ${config.ownerName}! Hope you're off to a lovely start today. What's on your mind?`,
        `Morning, ${config.ownerName}! Ready when you are. What are we getting into?`,
        `Good morning, ${config.ownerName}! Great to hear from you. How can I give you a hand today?`,
      ];
    } else if (hour < 18) {
      greetings = [
        `Hey there, ${config.ownerName}! Hope your day is going smoothly. What can I do for you?`,
        `Good afternoon, ${config.ownerName}! How are things travelling? Anything I can help with?`,
        `Hey ${config.ownerName}! Great to hear from you. What's happening?`,
      ];
    } else {
      greetings = [
        `Good evening, ${config.ownerName}! Hope you've had a solid day. What can I take off your shoulders?`,
        `Evening, ${config.ownerName}! How did the day treat you? What can I help you with tonight?`,
        `Hey ${config.ownerName}! Hope you're winding down nicely. How can I help?`,
      ];
    }

    const response = greetings[Math.floor(Math.random() * greetings.length)];
    return this.success(response);
  }
}
