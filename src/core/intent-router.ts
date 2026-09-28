import { SkillRegistry } from './skill-registry.js';
import type { IntentMatch } from '../types/index.js';

export interface InternalIntentPattern {
    pattern: RegExp;
    intent: string;
    skill: string;
    extractParams: (match: RegExpMatchArray) => Record<string, string>;
}

/**
 * IntentRouter handles matching user inputs to specific skills before hitting the LLM.
 */
export class IntentRouter {
    private registry: SkillRegistry;
    
    private builtInPatterns: InternalIntentPattern[] = [
        // Music patterns
        {
            pattern: /^(?:play music|play song|play) (.*)$/i,
            intent: 'play_music',
            skill: 'music',
            extractParams: (match) => ({ query: match[1] })
        },
        {
            pattern: /^(?:play music|play a song|play some music|play song)$/i,
            intent: 'play_music',
            skill: 'music',
            extractParams: () => ({})
        },
        // Alarm / reminder patterns
        {
            pattern: /^(?:set (?:an? )?alarm (?:for|at)|wake me up at) (.*)$/i,
            intent: 'set_alarm',
            skill: 'alarm',
            extractParams: (match) => ({ time: match[1] })
        },
        {
            pattern: /^(?:set (?:an? )?alarm|wake me up)$/i,
            intent: 'set_alarm',
            skill: 'alarm',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:remind me to|remind me|reminder) (.*)$/i,
            intent: 'set_reminder',
            skill: 'alarm',
            extractParams: (match) => ({ task: match[1] })
        },
        // Time patterns
        {
            pattern: /^(?:what(?:'?s| is) the time|what time is it|tell me the time|current time|the time)$/i,
            intent: 'get_time',
            skill: 'time',
            extractParams: () => ({})
        },
        // Date patterns
        {
            pattern: /^(?:what(?:'?s| is) today(?:'?s)? date|what is the date|what day is it|today(?:'?s)? date)$/i,
            intent: 'get_date',
            skill: 'time',
            extractParams: () => ({})
        },
        // Weather patterns
        {
            pattern: /^(?:weather|what(?:'?s| is) the weather|how(?:'?s| is) the weather)(?: in (.*))?$/i,
            intent: 'check_weather',
            skill: 'weather',
            extractParams: (match) => ({ location: match[1] || '' })
        },
        // Control patterns
        {
            pattern: /^(?:stop|pause|cancel|quit|shut up|be quiet|nevermind)$/i,
            intent: 'stop',
            skill: 'control',
            extractParams: () => ({})
        },
        // System status / How are you
        {
            pattern: /^(?:how are you(?: doing)?|how(?:'?s| is) it going|how are you today)$/i,
            intent: 'how_are_you',
            skill: 'system-info',
            extractParams: () => ({})
        },
        {
            pattern: /^(?:system (?:status|info)|are you (?:there|awake|alive|online))$/i,
            intent: 'system_status',
            skill: 'system-info',
            extractParams: () => ({})
        },
        // Greetings
        {
            pattern: /^(?:good morning|good afternoon|good evening|hello|hey|hi|hey zyra|hello zyra|hi zyra)$/i,
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
     * Normalizes utterance for robust pattern matching:
     * - Trims whitespace
     * - Strips trailing punctuation (? ! . , ; :)
     * - Collapses multiple whitespace
     */
    private cleanInput(text: string): string {
        return text
            .trim()
            .replace(/[?!.,;:]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Routes the input to a matched intent or returns null.
     * Uses a two-phase matching strategy (exact command matching and pattern matching).
     * 
     * @param input The user input to route.
     * @returns An IntentMatch object or null if no match is found (triggering LLM fallback).
     */
    public route(input: string): IntentMatch | null {
        const rawInput = input.trim();
        const cleaned = this.cleanInput(input);

        // 1. Check built-in patterns against both cleaned and raw input
        for (const bp of this.builtInPatterns) {
            const match = cleaned.match(bp.pattern) || rawInput.match(bp.pattern);
            if (match) {
                return {
                    intent: bp.intent,
                    skill: bp.skill,
                    confidence: 1.0,
                    parameters: bp.extractParams(match),
                    raw: rawInput
                };
            }
        }

        // 2. Check skill registry patterns
        for (const skillName of this.registry.list()) {
            const skill = this.registry.get(skillName);
            if (skill && skill.patterns) {
                for (const sp of skill.patterns) {
                    const match = cleaned.match(sp.pattern) || rawInput.match(sp.pattern);
                    if (match) {
                        return {
                            intent: sp.intent,
                            skill: skillName,
                            confidence: 0.9,
                            parameters: sp.extractParams ? sp.extractParams(match) : {},
                            raw: rawInput
                        };
                    }
                }
            }
        }

        // No match found - fallback to LLM
        return null;
    }
}
