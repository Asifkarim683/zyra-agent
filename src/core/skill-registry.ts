import type { SkillContext, SkillResult } from '../types/index.js';

// Re-export for convenience — skills import these from here
export type { SkillContext, SkillResult };

/**
 * Represents a pattern used for intent matching.
 */
export interface IntentPattern {
    /** The regular expression pattern to match against user input */
    pattern: RegExp;
    /** The intent identifier */
    intent: string;
    /** Optional function to extract parameters from the regex match */
    extractParams?: (match: RegExpMatchArray) => Record<string, string>;
}

/**
 * Interface defining a Skill Handler.
 */
export interface SkillHandler {
    /** Unique name of the skill */
    name: string;
    /** Description of what the skill does */
    description: string;
    /** Optional patterns this skill can directly match */
    patterns?: IntentPattern[];
    /** Executes the skill logic */
    execute(context: SkillContext): Promise<SkillResult>;
}

/**
 * SkillRegistry manages the registration and retrieval of skills.
 */
export class SkillRegistry {
    private skills: Map<string, SkillHandler> = new Map();

    /**
     * Registers a new skill handler.
     * @param name The unique name of the skill.
     * @param handler The implementation of the skill handler.
     */
    public register(name: string, handler: SkillHandler): void {
        this.skills.set(name, handler);
    }

    /**
     * Retrieves a skill handler by its name.
     * @param name The name of the skill to get.
     * @returns The SkillHandler or undefined if not found.
     */
    public get(name: string): SkillHandler | undefined {
        return this.skills.get(name);
    }

    /**
     * Lists all registered skill names.
     * @returns An array of registered skill names.
     */
    public list(): string[] {
        return Array.from(this.skills.keys());
    }

    /**
     * Checks if a skill is registered.
     * @param name The name of the skill.
     * @returns True if registered, false otherwise.
     */
    public has(name: string): boolean {
        return this.skills.has(name);
    }
}
