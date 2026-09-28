import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';

/**
 * Stub skill for setting alarms and reminders.
 */
export class AlarmSkill extends BaseSkill {
  name = 'alarm';
  description = 'Sets alarms and reminders (stub)';
  patterns: IntentPattern[] = [
    { pattern: /set (an? )?alarm/i, intent: 'set_alarm' },
    { pattern: /wake me up/i, intent: 'set_alarm' },
    { pattern: /remind me/i, intent: 'set_reminder' },
  ];

  /**
   * Executes the alarm request and extracts time parameters if present.
   * @param context The skill context.
   * @returns The skill result acknowledging the alarm.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const text = context.intent.raw;
    const match = text.match(/for (.*)|at (.*)/i);
    const timeParam = match ? (match[1] || match[2])?.trim() : null;

    if (timeParam) {
      return this.success(`Alarm set for ${timeParam}.`);
    }

    return this.success(`I've set your alarm.`);
  }
}
