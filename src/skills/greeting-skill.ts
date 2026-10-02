import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';

/**
 * Skill to handle greetings, gratitude, and farewells with human-like warmth and conversational variety.
 */
export class GreetingSkill extends BaseSkill {
  name = 'greeting';
  description = 'Responds to greetings, gratitude, and social conversational turns';
  patterns: IntentPattern[] = [
    { pattern: /^(hello|hey|hi|good morning|good afternoon|good evening|hey zyra|hello zyra|hi zyra)/i, intent: 'greet' },
    { pattern: /^(thank you|thanks|appreciate it)/i, intent: 'gratitude' },
    { pattern: /^(good night|goodnight|bye|goodbye|see you)/i, intent: 'farewell' },
  ];

  /**
   * Executes a warm, natural response based on social intent and time of day.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;
    const name = config.ownerName || 'Eren';

    if (intent === 'gratitude') {
      const gratitudeResponses = [
        `You're most welcome, ${name}. Always here to help.`,
        `You are very welcome, ${name}. Delighted to be of service.`,
        `You're always welcome, ${name}. Standing by whenever you need me.`,
      ];
      return this.success(gratitudeResponses[Math.floor(Math.random() * gratitudeResponses.length)]);
    }

    if (intent === 'farewell') {
      const farewellResponses = [
        `Good night, ${name}. Rest well, and I'll see you tomorrow.`,
        `Take care, ${name}. Have a restful evening.`,
        `Good night, ${name}. All systems standing by whenever you return.`,
      ];
      return this.success(farewellResponses[Math.floor(Math.random() * farewellResponses.length)]);
    }

    const hour = new Date().getHours();
    let greetings: string[];

    if (hour < 12) {
      greetings = [
        `Good morning, ${name}. What are we tackling today?`,
        `Morning, ${name}. How's everything going with you?`,
        `Good morning, ${name}. Ready when you are. What's on your mind?`,
      ];
    } else if (hour < 18) {
      greetings = [
        `Good afternoon, ${name}. How's your day shaping up?`,
        `Hey ${name}. Hope things are running smoothly. What's on your mind?`,
        `Afternoon, ${name}. What are you working on right now?`,
      ];
    } else {
      greetings = [
        `Good evening, ${name}. How did everything go today?`,
        `Evening, ${name}. Winding down, or still getting things done?`,
        `Hey ${name}. Hope you've had a solid day. What's on your mind?`,
      ];
    }

    const response = greetings[Math.floor(Math.random() * greetings.length)];
    return this.success(response);
  }
}
