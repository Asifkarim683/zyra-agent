import { SkillRegistry } from '../core/skill-registry.js';
import { GreetingSkill } from './greeting-skill.js';
import { TimeSkill } from './time-skill.js';
import { AlarmSkill } from './alarm-skill.js';
import { MusicSkill } from './music-skill.js';
import { ControlSkill } from './control-skill.js';
import { SystemInfoSkill } from './system-info-skill.js';
import { WeatherSkill } from './weather-skill.js';
import { MemorySkill } from './memory-skill.js';
import { TimerSkill } from './timer-skill.js';
import { TodoSkill } from './todo-skill.js';
import { SystemAutomationSkill } from './system-automation-skill.js';
import { SystemAutomationService } from '../services/system-automation-service.js';
import type { DatabaseService } from '../services/database.js';

export * from './base-skill.js';
export * from './greeting-skill.js';
export * from './time-skill.js';
export * from './alarm-skill.js';
export * from './music-skill.js';
export * from './control-skill.js';
export * from './system-info-skill.js';
export * from './weather-skill.js';
export * from './memory-skill.js';
export * from './timer-skill.js';
export * from './todo-skill.js';
export * from './system-automation-skill.js';

/**
 * Registers all built-in skills with the provided registry.
 * @param registry The skill registry instance to populate.
 * @param dbService Optional DatabaseService for memory and persistent skills.
 * @param automationService Optional SystemAutomationService for desktop automation.
 * @param options Optional configuration flags (enableAutomation defaults to false).
 */
export function registerAllSkills(
  registry: SkillRegistry,
  dbService?: DatabaseService,
  automationService?: SystemAutomationService,
  options: { enableAutomation?: boolean } = { enableAutomation: false }
): void {
  const skills = [
    new GreetingSkill(),
    new TimeSkill(),
    new AlarmSkill(),
    new MusicSkill(),
    new ControlSkill(),
    new SystemInfoSkill(),
    new WeatherSkill(),
    new MemorySkill(dbService),
    new TimerSkill(),
    new TodoSkill(dbService),
  ];

  // System Automation is intentionally kept inactive in the active model for now.
  // Preserved as an architectural idea and ready for future integration.
  if (options.enableAutomation) {
    const autoSvc = automationService || new SystemAutomationService(dbService);
    skills.push(new SystemAutomationSkill(autoSvc));
  }

  for (const skill of skills) {
    registry.register(skill.name, skill);
  }
}
