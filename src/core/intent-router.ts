import { SkillRegistry } from './skill-registry.js';
import type { IntentMatch } from '../types/index.js';

export interface InternalIntentPattern {
    pattern: RegExp;
    intent: string;
    skill: string;
    extractParams: (match: RegExpMatchArray) => Record<string, string>;
}

/**
 * IntentRouter handles matching user inputs to specific skills.
 */
export class IntentRouter {
    private registry: SkillRegistry;
    
    private builtInPatterns: InternalIntentPattern[] = [
        {
            pattern: /^(?:play music|play song|play) (.*)$/i,
            intent: 'play_music',
            skill: 'music',
            extractParams: (match) => ({ query: match[1] })
        },
        {
            pattern: /^(?:play music|play song)$/i,
            intent: 'play_music',
            skill: 'music',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:set alarm|wake me up at) (.*)$/i,
            intent: 'set_alarm',
            skill: 'alarm',
            extractParams: (match) => ({ time: match[1] })
        },
        {
            pattern: /^(?:what time is it|current time)$/i,
            intent: 'get_time',
            skill: 'time',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:what(?:'?s| is) today(?:'?s)? date|what day is it)$/i,
            intent: 'get_date',
            skill: 'time',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:weather|what's the weather)$/i,
            intent: 'check_weather',
            skill: 'weather',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:remind me|reminder) (.*)$/i,
            intent: 'set_reminder',
            skill: 'alarm',
            extractParams: (match) => ({ task: match[1] })
        },
        {
            pattern: /^(?:stop|pause|cancel)$/i,
            intent: 'stop',
            skill: 'control',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:good morning|good afternoon|good evening|hello|hey|hey zyra|hello zyra)$/i,
            intent: 'greet',
            skill: 'greeting',
            extractParams: () => ({})
        }
    ];

    /**
     * @param registry The skill registry to fetch custom intent patterns from.
     */
    constructor(registry: SkillRegistry) {
        this.registry = registry;
    }

    /**
     * Routes the input to a matched intent or returns null.
     * Uses a two-phase matching strategy (exact command matching and pattern matching).
     * 
     * @param input The user input to route.
     * @returns An IntentMatch object or null if no match is found (triggering LLM fallback).
     */
    public route(input: string): IntentMatch | null {
        const normalizedInput = input.trim();

        // 1. Check built-in patterns
        for (const bp of this.builtInPatterns) {
            const match = normalizedInput.match(bp.pattern);
            if (match) {
                const isExact = match[0].length === normalizedInput.length;
                return {
                    intent: bp.intent,
                    skill: bp.skill,
                    confidence: isExact ? 1.0 : 0.8,
                    parameters: bp.extractParams(match),
                    raw: normalizedInput
                };
            }
        }

        // 2. Check skill registry patterns
        for (const skillName of this.registry.list()) {
            const skill = this.registry.get(skillName);
            if (skill && skill.patterns) {
                for (const sp of skill.patterns) {
                    const match = normalizedInput.match(sp.pattern);
                    if (match) {
                        const isExact = match[0].length === normalizedInput.length;
                        return {
                            intent: sp.intent,
                            skill: skillName,
                            confidence: isExact ? 1.0 : 0.8,
                            parameters: sp.extractParams ? sp.extractParams(match) : {},
                            raw: normalizedInput
                        };
                    }
                }
            }
        }

        // No match found - fallback to LLM
        return null;
    }
}
