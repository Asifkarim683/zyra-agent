import { SkillRegistry } from '../core/skill-registry.js';
import { GreetingSkill } from './greeting-skill.js';
import { TimeSkill } from './time-skill.js';
import { AlarmSkill } from './alarm-skill.js';
import { MusicSkill } from './music-skill.js';
import { ControlSkill } from './control-skill.js';
import { SystemInfoSkill } from './system-info-skill.js';

export * from './base-skill.js';
export * from './greeting-skill.js';
export * from './time-skill.js';
export * from './alarm-skill.js';
export * from './music-skill.js';
export * from './control-skill.js';
export * from './system-info-skill.js';

/**
 * Registers all built-in skills with the provided registry.
 * @param registry The skill registry instance to populate.
 */
export function registerAllSkills(registry: SkillRegistry): void {
  const skills = [
    new GreetingSkill(),
    new TimeSkill(),
    new AlarmSkill(),
    new MusicSkill(),
    new ControlSkill(),
    new SystemInfoSkill(),
  ];

  for (const skill of skills) {
    registry.register(skill.name, skill);
  }
}
