import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import { config } from '../config/index.js';
import type { DatabaseService } from '../services/database.js';
import type { LLMService } from '../services/llm/llm-service.js';
import { FactInterpreter } from '../services/fact-interpreter.js';
import { logger } from '../config/logger.js';

/**
 * Skill allowing Zyra to store, recall, and manage long-term personal facts about Eren in SQLite.
 * Powered by an intelligent FactInterpreter that extracts clean entities and gives articulate British confirmations.
 */
export class MemorySkill extends BaseSkill {
  name = 'memory';
  description = 'Stores, updates, and recalls persistent personal facts and preferences directly in conversation';
  patterns: IntentPattern[] = [
    {
      pattern: /^(?:remember that|remember|don't forget that|keep in mind that|save that|note that) (.*)$/i,
      intent: 'remember_fact',
      extractParams: (match) => ({ fact: match[1].trim() }),
    },
    {
      pattern: /^(?:i(?:'m| am|m)|i live|i stay|i am based|i'm based|im based)\s+(?:in|from|at)\s+(.*)$/i,
      intent: 'remember_fact',
      extractParams: (match) => ({ fact: match[0].trim() }),
    },
    {
      pattern: /^(?:change|update|set) my ([a-zA-Z\s]+?) to (.*)$/i,
      intent: 'update_fact',
      extractParams: (match) => ({ property: match[1].trim(), value: match[2].trim() }),
    },
    {
      pattern: /^my ([a-zA-Z\s]+?) is (.*)$/i,
      intent: 'remember_fact',
      extractParams: (match) => ({ fact: match[0].trim(), property: match[1].trim(), value: match[2].trim() }),
    },
    {
      pattern: /^(?:where (?:am i from|do i live|am i based)|where is my home)$/i,
      intent: 'recall_specific',
      extractParams: () => ({ property: 'location' }),
    },
    {
      pattern: /^(?:what do i do(?: for a living)?|what(?:'s| is) my (?:job|profession|career|role))$/i,
      intent: 'recall_specific',
      extractParams: () => ({ property: 'profession' }),
    },
    {
      pattern: /^(?:do you remember my|what is my|what's my) ([a-zA-Z\s]+)$/i,
      intent: 'recall_specific',
      extractParams: (match) => ({ property: match[1].trim() }),
    },
    {
      pattern: /^(?:clear all memories|forget everything(?: about me)?|wipe (?:all )?memories|clear (?:my )?memory)$/i,
      intent: 'clear_all',
    },
    {
      pattern: /^(?:what do you remember about me|what do you remember|what do you know about me|what are my preferences|list my memories|show my memories|what's in my memory)$/i,
      intent: 'recall_all',
    },
    {
      pattern: /^(?:forget that|forget my|forget|delete my|delete|remove my|remove) (.*)$/i,
      intent: 'forget_fact',
      extractParams: (match) => ({ key: match[1].trim() }),
    },
  ];

  private dbService?: DatabaseService;
  private llmService?: LLMService;

  constructor(dbService?: DatabaseService, llmService?: LLMService) {
    super();
    this.dbService = dbService;
    this.llmService = llmService;
  }

  /**
   * Sets the LLM service dynamically if initialized later.
   */
  public setLLMService(llmService: LLMService): void {
    this.llmService = llmService;
  }

  private formatKeyTitle(key: string): string {
    return key
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Executes the memory action.
   */
  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;

    if (!this.dbService) {
      return this.success("I don't have access to my long-term database right now.");
    }

    // 1. Remember a new fact (Interpreted intelligently)
    if (intent === 'remember_fact') {
      let rawFact = context.intent.parameters?.fact || '';
      if (!rawFact && context.intent.parameters?.property && context.intent.parameters?.value) {
        rawFact = `my ${context.intent.parameters.property} is ${context.intent.parameters.value}`;
      }
      if (!rawFact) {
        return this.success(`What would you like me to remember, ${config.ownerName}?`);
      }

      // Run through natural language entity interpreter
      const interpreted = await FactInterpreter.interpret(
        rawFact,
        config.ownerName,
        this.llmService
      );

      // Save primary memory
      this.dbService.setMemory(interpreted.key, interpreted.value, interpreted.category);
      logger.info(`Saved persistent memory: [${interpreted.key}] = "${interpreted.value}" (${interpreted.category})`);

      // Save secondary memories (e.g. city, state, country, company)
      if (interpreted.secondaryMemories) {
        for (const [subKey, subVal] of Object.entries(interpreted.secondaryMemories)) {
          if (subKey !== interpreted.key && subVal) {
            this.dbService.setMemory(subKey, subVal, interpreted.category);
            logger.info(`Saved secondary memory: [${subKey}] = "${subVal}"`);
          }
        }
      }

      return this.success(interpreted.confirmation);
    }

    // 2. Update an existing fact
    if (intent === 'update_fact') {
      const prop = (context.intent.parameters?.property || '').trim();
      const value = (context.intent.parameters?.value || '').trim();
      if (!prop || !value) {
        return this.success('What would you like to update?');
      }

      // Check if location
      if (/location|city|home/i.test(prop)) {
        const parsed = FactInterpreter.parseLocationText(value);
        this.dbService.setMemory('location', parsed.fullLocation, 'user_profile');
        if (parsed.secondary) {
          for (const [subK, subV] of Object.entries(parsed.secondary)) {
            this.dbService.setMemory(subK, subV, 'user_profile');
          }
        }
        logger.info(`Updated location memory to: ${parsed.fullLocation}`);
        return this.success(`Updated your location to ${parsed.fullLocation}, ${config.ownerName}.`);
      }

      const key = prop.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      this.dbService.setMemory(key, value, 'user_preference');
      logger.info(`Updated persistent memory: [${key}] = "${value}"`);

      return this.success(`Updated your ${prop.replace(/_/g, ' ')} to ${value}, ${config.ownerName}.`);
    }

    // 3. Recall specific fact
    if (intent === 'recall_specific') {
      const prop = (context.intent.parameters?.property || '').trim().toLowerCase();
      const key = prop.replace(/[^a-z0-9]+/g, '_');
      const memories = this.dbService.getAllMemories();

      // Smart semantic mappings for common inquiries
      if (['location', 'city', 'country', 'home', 'hometown'].includes(key)) {
        if (memories['location']) {
          return this.success(`You are from ${memories['location']}.`);
        }
        if (memories['city']) {
          return this.success(`You are based in ${memories['city']}.`);
        }
      }

      if (['profession', 'job', 'work', 'role', 'career'].includes(key)) {
        if (memories['profession']) {
          return this.success(`You work as a ${memories['profession']}.`);
        }
        if (memories['workplace'] || memories['company']) {
          return this.success(`You work at ${memories['workplace'] || memories['company']}.`);
        }
      }

      if (key === 'birthday' && memories['birthday']) {
        return this.success(`Your birthday is ${memories['birthday']}.`);
      }

      let matchedKey = Object.keys(memories).find((k) => k === key);
      if (!matchedKey) {
        matchedKey = Object.keys(memories).find((k) => k.includes(key) || key.includes(k));
      }

      if (matchedKey && memories[matchedKey]) {
        return this.success(`Your ${matchedKey.replace(/_/g, ' ')} is ${memories[matchedKey]}.`);
      } else {
        return this.success(`I don't have your ${prop} saved in memory yet, ${config.ownerName}. You can tell me anytime in chat!`);
      }
    }

    // 4. Recall all memories
    if (intent === 'recall_all') {
      const memories = this.dbService.getAllMemories();
      const keys = Object.keys(memories);

      if (keys.length === 0) {
        return this.success(`I don't have any facts saved about you yet, ${config.ownerName}. Just tell me in chat, like "My favorite food is sushi"!`);
      }

      const lines = keys.map((k) => `• ${this.formatKeyTitle(k)}: ${memories[k]}`).join('\n');
      return this.success(`Here's what I currently remember about you, ${config.ownerName}:\n${lines}`);
    }

    // 5. Clear all memories
    if (intent === 'clear_all') {
      const memories = this.dbService.getAllMemories();
      for (const k of Object.keys(memories)) {
        this.dbService.deleteMemory(k);
      }
      logger.info('Cleared all persistent memories');
      return this.success(`I've cleared all saved facts from my long-term memory.`);
    }

    // 6. Forget a specific fact
    if (intent === 'forget_fact') {
      const keyInput = (context.intent.parameters?.key || '').toLowerCase().trim();
      const normalizedKey = keyInput.replace(/[^a-z0-9]+/g, '_');
      const memories = this.dbService.getAllMemories();

      let targetKey = Object.keys(memories).find((k) => k === normalizedKey || k === keyInput);
      if (!targetKey) {
        targetKey = Object.keys(memories).find((k) => k.includes(normalizedKey) || normalizedKey.includes(k));
      }

      if (targetKey) {
        this.dbService.deleteMemory(targetKey);
        logger.info(`Removed persistent memory for key: ${targetKey}`);
        return this.success(`Done, ${config.ownerName}. I've wiped your ${targetKey.replace(/_/g, ' ')} from memory.`);
      }

      this.dbService.deleteMemory(normalizedKey);
      return this.success(`Done, ${config.ownerName}. I've removed that from my memory.`);
    }

    return this.success(`I'm not quite sure what to do with that memory.`);
  }
}
