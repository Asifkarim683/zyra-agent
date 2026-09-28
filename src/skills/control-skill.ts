import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';

/**
 * Skill for simple control commands like stop and cancel.
 */
export class ControlSkill extends BaseSkill {
  name = 'control';
  description = 'Control commands';
  patterns: IntentPattern[] = [
    { pattern: /^(?:stop|pause|cancel|quit|shut up|be quiet|nevermind)$/i, intent: 'stop' },
  ];

  /**
   * Executes the control command.
   * @param context The skill context.
   * @returns The skill result acknowledging the command.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    return this.success('Okay.');
  }
}
