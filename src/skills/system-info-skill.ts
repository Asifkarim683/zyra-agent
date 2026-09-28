import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill to return system status with warm, human conversational tone.
 */
export class SystemInfoSkill extends BaseSkill {
  name = 'system-info';
  description = 'System information and status';
  patterns: IntentPattern[] = [
    { pattern: /system (status|info)/i, intent: 'system_status' },
    { pattern: /how are you/i, intent: 'how_are_you' },
    { pattern: /are you (there|awake|alive|online)/i, intent: 'system_status' },
  ];

  /**
   * Executes the system info request.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const text = context.intent.raw.toLowerCase();

    if (text.includes('how are you')) {
      const options = [
        `I'm doing brilliantly, thank you ${config.ownerName}! Running smooth and ready for whatever we've got planned. How are you doing?`,
        `Feeling great, ${config.ownerName}! Full of energy and at your service. How's everything on your end?`,
        `Couldn't be better, ${config.ownerName}! Sharp, attentive, and happy to hear from you. What's up?`,
      ];
      return this.success(options[Math.floor(Math.random() * options.length)]);
    }

    if (text.includes('there') || text.includes('awake') || text.includes('alive') || text.includes('online')) {
      return this.success(`Right here with you, ${config.ownerName}! What's on your mind?`);
    }

    const uptime = process.uptime();
    const minutes = Math.floor(uptime / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const uptimeStr = hours > 0 ? `${hours} hours and ${remainingMinutes} minutes` : `${minutes} minutes`;

    return this.success(
      `Everything is running smoothly, ${config.ownerName}. I've been active for about ${uptimeStr}, connected to your local model, and ready to go.`
    );
  }
}
