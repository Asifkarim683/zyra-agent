import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import type { BriefingService } from '../services/briefing-service.js';

/**
 * Skill to generate and deliver daily intelligence voice briefings.
 */
export class BriefingSkill extends BaseSkill {
  name = 'briefing';
  description = 'Provides comprehensive live voice briefings covering weather, agenda tasks, news, and system status';
  patterns: IntentPattern[] = [
    { pattern: /^(?:give me (?:my |a )?|what(?:'s| is) my )?(?:daily |morning |evening |voice )?briefing/i, intent: 'daily_briefing' },
    { pattern: /^brief me(?: on (?:today|everything))?/i, intent: 'daily_briefing' },
    { pattern: /^morning briefing/i, intent: 'morning_briefing' },
    { pattern: /^evening briefing/i, intent: 'evening_briefing' },
    { pattern: /^daily summary/i, intent: 'daily_briefing' },
  ];

  private briefingService: BriefingService;

  constructor(briefingService: BriefingService) {
    super();
    this.briefingService = briefingService;
  }

  async execute(context: SkillContext): Promise<SkillResult> {
    const raw = (context.intent?.raw || '').toLowerCase();
    let type: 'morning' | 'evening' | 'general' = 'general';

    if (context.intent?.intent === 'morning_briefing' || raw.includes('morning')) {
      type = 'morning';
    } else if (context.intent?.intent === 'evening_briefing' || raw.includes('evening') || raw.includes('night')) {
      type = 'evening';
    }

    const location = context.intent?.parameters?.location;
    const result = await this.briefingService.generateBriefing(type, location);

    return {
      response: result.displayText,
      action: 'briefing_generated',
      data: {
        briefing: result,
      },
    };
  }
}
