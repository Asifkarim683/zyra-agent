import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill for setting alarms and reminders with natural parameter extraction.
 */
export class AlarmSkill extends BaseSkill {
  name = 'alarm';
  description = 'Sets alarms and reminders';
  patterns: IntentPattern[] = [
    { pattern: /set (an? )?alarm/i, intent: 'set_alarm' },
    { pattern: /wake me up/i, intent: 'set_alarm' },
    { pattern: /remind me/i, intent: 'set_reminder' },
  ];

  /**
   * Executes the alarm or reminder request.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;
    const text = context.intent.raw;
    const match = text.match(/for (.*)|at (.*)/i);
    const timeFromRaw = match ? (match[1] || match[2])?.trim() : null;
    const timeParam = context.intent.parameters?.time || timeFromRaw;
    const taskParam = context.intent.parameters?.task;

    if (intent === 'set_reminder') {
      if (taskParam) {
        return this.success(`I'll remind you to ${taskParam}${timeParam ? ` at ${timeParam}` : ''}, ${config.ownerName}.`);
      }
      return this.success(`I've set your reminder, ${config.ownerName}.`);
    }

    if (timeParam) {
      return this.success(`Alarm set for ${timeParam}.`);
    }

    return this.success(`I've set your alarm, ${config.ownerName}.`);
  }
}
