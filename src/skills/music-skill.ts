import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';

/**
 * Stub skill for music playback control.
 */
export class MusicSkill extends BaseSkill {
  name = 'music';
  description = 'Music playback stub';
  patterns: IntentPattern[] = [
    { pattern: /play (some |)music/i, intent: 'play_music' },
    { pattern: /play (a |)song/i, intent: 'play_music' },
    { pattern: /play (.+)/i, intent: 'play_music', extractParams: (m) => ({ query: m[1] }) },
  ];

  /**
   * Executes the music request and acknowledges playback.
   * @param context The skill context.
   * @returns The skill result with acknowledgment.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const query = context.intent.parameters?.query;
    const display = query && !query.match(/^(some |a )?(music|song)$/i) ? query.trim() : 'music';

    return this.success(`Now playing: ${display}.`);
  }
}
