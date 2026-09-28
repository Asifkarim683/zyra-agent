import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';
import type { DatabaseService } from '../services/database.js';
import { logger } from '../config/logger.js';

/**
 * Skill allowing Zyra to store, recall, and manage long-term personal facts about Eren in SQLite.
 */
export class MemorySkill extends BaseSkill {
  name = 'memory';
  description = 'Stores and recalls persistent personal facts and preferences in SQLite';
  patterns: IntentPattern[] = [
    {
      pattern: /^(?:remember that|remember|don't forget that|keep in mind that) (.*)$/i,
      intent: 'remember_fact',
      extractParams: (match) => ({ fact: match[1].trim() }),
    },
    {
      pattern: /^(?:what do you remember about me|what do you know about me|what are my preferences|list my memories)$/i,
      intent: 'recall_all',
    },
    {
      pattern: /^(?:forget that|forget my|forget) (.*)$/i,
      intent: 'forget_fact',
      extractParams: (match) => ({ key: match[1].trim() }),
    },
  ];

  private dbService?: DatabaseService;

  constructor(dbService?: DatabaseService) {
    super();
    this.dbService = dbService;
  }

  /**
   * Extracts a simplified key and value from a freeform memory statement.
   * e.g. "my favorite color is emerald green" -> key: "favorite_color", value: "emerald green"
   */
  private parseFact(rawFact: string): { key: string; value: string } {
    const text = rawFact.replace(/[?!.]+$/, '').trim();

    // Pattern: my [something] is [value]
    const myMatch = text.match(/^my\s+([a-zA-Z\s]+?)\s+is\s+(.*)$/i);
    if (myMatch) {
      const key = myMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      return { key, value: myMatch[2].trim() };
    }

    // Pattern: I [verb] [something] e.g. "I love sushi", "I work at Google"
    const iMatch = text.match(/^i\s+(.*)$/i);
    if (iMatch) {
      const key = text.slice(0, 25).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      return { key, value: text };
    }

    // Fallback: generic key
    const key = text.slice(0, 20).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return { key, value: text };
  }

  /**
   * Executes the memory action.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;

    if (!this.dbService) {
      return this.success("I don't have access to my long-term database right now.");
    }

    // 1. Remember a new fact
    if (intent === 'remember_fact') {
      const rawFact = context.intent.parameters?.fact || '';
      if (!rawFact) {
        return this.success('What would you like me to remember, Eren?');
      }

      const { key, value } = this.parseFact(rawFact);
      this.dbService.setMemory(key, value, 'user_preference');
      logger.info(`Saved persistent memory: [${key}] = "${value}"`);

      const confirmations = [
        `Got it, ${config.ownerName}! I've locked that into memory.`,
        `Stored! I'll remember that ${rawFact}.`,
        `Committed to memory, ${config.ownerName}.`,
      ];
      return this.success(confirmations[Math.floor(Math.random() * confirmations.length)]);
    }

    // 2. Recall all memories
    if (intent === 'recall_all') {
      const memories = this.dbService.getAllMemories();
      const keys = Object.keys(memories);

      if (keys.length === 0) {
        return this.success(`I don't have any specific facts saved about you yet, ${config.ownerName}. Tell me something to remember!`);
      }

      const lines = keys.map((k) => `• ${k.replace(/_/g, ' ')}: ${memories[k]}`).join('\n');
      return this.success(`Here's what I have saved in my memory about you, ${config.ownerName}:\n${lines}`);
    }

    // 3. Forget a fact
    if (intent === 'forget_fact') {
      const keyInput = (context.intent.parameters?.key || '').toLowerCase().trim();
      const normalizedKey = keyInput.replace(/\s+/g, '_');

      this.dbService.deleteMemory(normalizedKey);
      this.dbService.deleteMemory(keyInput);
      logger.info(`Removed persistent memory for key: ${keyInput}`);

      return this.success(`Done, ${config.ownerName}. I've wiped that from my memory.`);
    }

    return this.success(`I'm not quite sure what to do with that memory.`);
  }
}
