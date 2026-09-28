import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';

/**
 * Skill to return the current time and date.
 */
export class TimeSkill extends BaseSkill {
  name = 'time';
  description = 'Returns current time and/or date';
  patterns: IntentPattern[] = [
    { pattern: /what('?s| is) the time/i, intent: 'get_time' },
    { pattern: /current time/i, intent: 'get_time' },
    { pattern: /what('?s| is) today('?s)? date/i, intent: 'get_date' },
    { pattern: /what day is it/i, intent: 'get_date' },
  ];

  /**
   * Executes the time request and returns formatted date/time.
   * @param context The skill context.
   * @returns The skill result with the time/date.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const response = `It's ${formatter.format(now)}.`;
    return this.success(response);
  }
}
