import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill to return system information and status.
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
   * @param context The skill context.
   * @returns The skill result with the system status.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const text = context.intent.raw.toLowerCase();

    if (text.includes('how are you')) {
      return this.success(`I'm doing well, ${config.ownerName}! All systems are operating normally.`);
    }

    if (text.includes('system') || text.includes('info') || text.includes('status')) {
      const uptime = process.uptime();
      const minutes = Math.floor(uptime / 60);
      const seconds = Math.floor(uptime % 60);
      return this.success(`I am online. Uptime is ${minutes} minutes and ${seconds} seconds. Running as ${config.assistantName}.`);
    }

    return this.success(`I'm online and ready, ${config.ownerName}.`);
  }
}
