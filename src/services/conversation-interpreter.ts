import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { FactInterpreter } from './fact-interpreter.js';
import { TypoCorrector } from '../core/typo-corrector.js';
import type { DatabaseService } from './database.js';
import type { LLMService } from './llm/llm-service.js';

export type ConversationalDomain =
  | 'memory'
  | 'alarm'
  | 'timer'
  | 'todo'
  | 'weather'
  | 'time'
  | 'music'
  | 'calculation'
  | 'briefing'
  | 'system_control'
  | 'system_status'
  | 'greeting'
  | 'social'
  | 'general_chat';

export interface InterpretedUtterance {
  raw: string;
  cleaned: string;
  domain: ConversationalDomain;
  intent: string;
  skill?: string;
  confidence: number;
  parameters: Record<string, string>;
  entities: Record<string, any>;
  politenessRemoved: string[];
  contextHints: {
    hasLocation: boolean;
    hasTimeOrDuration: boolean;
    hasGreeting: boolean;
    hasGratitude: boolean;
    isQuestion: boolean;
    requiresLLM: boolean;
  };
  directResponse?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  half: 0.5,
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fortyfive: 45,
  fifty: 50,
  sixty: 60,
};

/**
 * Universal Conversational Text Interpreter.
 * Normalizes, contextualizes, and extracts semantic intent across all conversation types.
 */
export class ConversationInterpreter {
  /**
   * Synchronously interprets any conversational user utterance with 100% deterministic precision.
   */
  public static interpretSync(
    rawInput: string,
    ownerName: string = config.ownerName || 'Eren',
    dbService?: DatabaseService
  ): InterpretedUtterance {
    const raw = rawInput.trim();
    const corrected = TypoCorrector.correct(raw);
    const { cleaned, removedMarkers } = this.stripConversationalPreamble(corrected);

    const contextHints = {
      hasLocation: false,
      hasTimeOrDuration: false,
      hasGreeting: false,
      hasGratitude: false,
      isQuestion: raw.endsWith('?') || /^(what|how|where|when|why|who|can you|could you|is|are|do)\b/i.test(raw),
      requiresLLM: false,
    };

    // 1. Social & Chit-Chat (Gratitude, Farewells, Greetings, Identity)
    const social = this.parseSocial(cleaned, raw, ownerName);
    if (social) {
      if (social.intent === 'gratitude') contextHints.hasGratitude = true;
      if (social.intent === 'greet') contextHints.hasGreeting = true;
      return {
        raw,
        cleaned,
        domain: social.domain,
        intent: social.intent,
        skill: social.skill,
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
        directResponse: social.directResponse,
      };
    }

    // 2. Control Commands (stop, pause, quiet)
    const control = this.parseControl(cleaned);
    if (control) {
      return {
        raw,
        cleaned,
        domain: 'system_control',
        intent: control.intent,
        skill: 'control',
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 3. System Status & Health
    const sysStatus = this.parseSystemStatus(cleaned);
    if (sysStatus) {
      return {
        raw,
        cleaned,
        domain: 'system_status',
        intent: sysStatus.intent,
        skill: 'system-info',
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 4. Memory & Personal Facts (deterministic sync)
    const memory = this.parseMemorySync(cleaned, raw, ownerName);
    if (memory) {
      return {
        raw,
        cleaned,
        domain: 'memory',
        intent: memory.intent,
        skill: 'memory',
        confidence: 1.0,
        parameters: memory.parameters,
        entities: memory.entities,
        politenessRemoved: removedMarkers,
        contextHints,
        directResponse: memory.directResponse,
      };
    }

    // 5. Daily Voice Briefings
    const briefing = this.parseBriefing(cleaned);
    if (briefing) {
      return {
        raw,
        cleaned,
        domain: 'briefing',
        intent: briefing.intent,
        skill: 'briefing',
        confidence: 1.0,
        parameters: briefing.parameters,
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 6. Timers
    const timer = this.parseTimer(cleaned);
    if (timer) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'timer',
        intent: timer.intent,
        skill: 'timer',
        confidence: 1.0,
        parameters: timer.parameters,
        entities: timer.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 7. Alarms & Reminders
    const alarm = this.parseAlarm(cleaned);
    if (alarm) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'alarm',
        intent: alarm.intent,
        skill: 'alarm',
        confidence: 1.0,
        parameters: alarm.parameters,
        entities: alarm.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 8. Tasks & Todos
    const todo = this.parseTodo(cleaned);
    if (todo) {
      return {
        raw,
        cleaned,
        domain: 'todo',
        intent: todo.intent,
        skill: 'todo',
        confidence: 1.0,
        parameters: todo.parameters,
        entities: todo.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 9. Weather
    const weather = this.parseWeather(cleaned, dbService);
    if (weather) {
      contextHints.hasLocation = true;
      return {
        raw,
        cleaned,
        domain: 'weather',
        intent: 'check_weather',
        skill: 'weather',
        confidence: 1.0,
        parameters: weather.parameters,
        entities: weather.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 10. World Time & Dates
    const time = this.parseTime(cleaned);
    if (time) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'time',
        intent: time.intent,
        skill: 'time',
        confidence: 1.0,
        parameters: time.parameters,
        entities: time.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 11. Music & Audio
    const music = this.parseMusic(cleaned);
    if (music) {
      return {
        raw,
        cleaned,
        domain: 'music',
        intent: music.intent || 'play_music',
        skill: 'music',
        confidence: 1.0,
        parameters: music.parameters,
        entities: music.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 12. General Conversational / LLM Reasoning
    contextHints.requiresLLM = true;
    return {
      raw,
      cleaned,
      domain: 'general_chat',
      intent: 'llm_reasoning',
      confidence: 0.5,
      parameters: { prompt: cleaned },
      entities: {},
      politenessRemoved: removedMarkers,
      contextHints,
    };
  }

  /**
   * Interprets any conversational user utterance asynchronously (with optional LLM fallback).
   */
  public static async interpret(
    rawInput: string,
    ownerName: string = config.ownerName || 'Eren',
    dbService?: DatabaseService,
    llmService?: LLMService
  ): Promise<InterpretedUtterance> {
    const raw = rawInput.trim();
    const corrected = TypoCorrector.correct(raw);
    const { cleaned, removedMarkers } = this.stripConversationalPreamble(corrected);

    const contextHints = {
      hasLocation: false,
      hasTimeOrDuration: false,
      hasGreeting: false,
      hasGratitude: false,
      isQuestion: raw.endsWith('?') || /^(what|how|where|when|why|who|can you|could you|is|are|do)\b/i.test(raw),
      requiresLLM: false,
    };

    // 1. Social & Chit-Chat (Gratitude, Farewells, Greetings, Identity)
    const social = this.parseSocial(cleaned, raw, ownerName);
    if (social) {
      if (social.intent === 'gratitude') contextHints.hasGratitude = true;
      if (social.intent === 'greet') contextHints.hasGreeting = true;
      return {
        raw,
        cleaned,
        domain: social.domain,
        intent: social.intent,
        skill: social.skill,
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
        directResponse: social.directResponse,
      };
    }

    // 2. Control Commands (stop, pause, quiet)
    const control = this.parseControl(cleaned);
    if (control) {
      return {
        raw,
        cleaned,
        domain: 'system_control',
        intent: control.intent,
        skill: 'control',
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 3. System Status & Health
    const sysStatus = this.parseSystemStatus(cleaned);
    if (sysStatus) {
      return {
        raw,
        cleaned,
        domain: 'system_status',
        intent: sysStatus.intent,
        skill: 'system-info',
        confidence: 1.0,
        parameters: {},
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 4. Memory & Personal Facts (delegated to FactInterpreter)
    const memory = await this.parseMemory(cleaned, raw, ownerName, dbService, llmService);
    if (memory) {
      return {
        raw,
        cleaned,
        domain: 'memory',
        intent: memory.intent,
        skill: 'memory',
        confidence: 1.0,
        parameters: memory.parameters,
        entities: memory.entities,
        politenessRemoved: removedMarkers,
        contextHints,
        directResponse: memory.directResponse,
      };
    }

    // 5. Daily Voice Briefings
    const briefing = this.parseBriefing(cleaned);
    if (briefing) {
      return {
        raw,
        cleaned,
        domain: 'briefing',
        intent: briefing.intent,
        skill: 'briefing',
        confidence: 1.0,
        parameters: briefing.parameters,
        entities: {},
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 6. Timers
    const timer = this.parseTimer(cleaned);
    if (timer) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'timer',
        intent: timer.intent,
        skill: 'timer',
        confidence: 1.0,
        parameters: timer.parameters,
        entities: timer.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 7. Alarms & Reminders
    const alarm = this.parseAlarm(cleaned);
    if (alarm) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'alarm',
        intent: alarm.intent,
        skill: 'alarm',
        confidence: 1.0,
        parameters: alarm.parameters,
        entities: alarm.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 8. Tasks & Todos
    const todo = this.parseTodo(cleaned);
    if (todo) {
      return {
        raw,
        cleaned,
        domain: 'todo',
        intent: todo.intent,
        skill: 'todo',
        confidence: 1.0,
        parameters: todo.parameters,
        entities: todo.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 9. Weather
    const weather = this.parseWeather(cleaned, dbService);
    if (weather) {
      contextHints.hasLocation = true;
      return {
        raw,
        cleaned,
        domain: 'weather',
        intent: 'check_weather',
        skill: 'weather',
        confidence: 1.0,
        parameters: weather.parameters,
        entities: weather.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 10. World Time & Dates
    const time = this.parseTime(cleaned);
    if (time) {
      contextHints.hasTimeOrDuration = true;
      return {
        raw,
        cleaned,
        domain: 'time',
        intent: time.intent,
        skill: 'time',
        confidence: 1.0,
        parameters: time.parameters,
        entities: time.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 11. Music & Audio
    const music = this.parseMusic(cleaned);
    if (music) {
      return {
        raw,
        cleaned,
        domain: 'music',
        intent: music.intent || 'play_music',
        skill: 'music',
        confidence: 1.0,
        parameters: music.parameters,
        entities: music.entities,
        politenessRemoved: removedMarkers,
        contextHints,
      };
    }

    // 12. General Conversational / LLM Reasoning
    contextHints.requiresLLM = true;
    return {
      raw,
      cleaned,
      domain: 'general_chat',
      intent: 'llm_reasoning',
      confidence: 0.5,
      parameters: { prompt: cleaned },
      entities: {},
      politenessRemoved: removedMarkers,
      contextHints,
    };
  }

  /**
   * Strips conversational filler and politeness framing while preserving the core request.
   * e.g. "Hey Zyra, could you please wake me up at 7am?" -> "wake me up at 7am"
   */
  public static stripConversationalPreamble(input: string): {
    cleaned: string;
    removedMarkers: string[];
  } {
    let str = input.trim();
    const removedMarkers: string[] = [];

    // Strip trailing punctuation
    str = str.replace(/[?!.,;:]+$/, '').trim();

    let changed = true;
    while (changed) {
      changed = false;

      // Invocations: "hey zyra", "hi zyra", "zyra"
      const invocationMatch = str.match(/^(?:hey|hi|hello|ok|okay)?\s*\bzyra\b[,:\s]*/i);
      if (invocationMatch && invocationMatch[0].length > 0) {
        removedMarkers.push(invocationMatch[0].trim());
        str = str.slice(invocationMatch[0].length).trim();
        changed = true;
      }

      // Politeness openers & conversational framing
      const politenessPattern =
        /^(?:could you please tell me|can you please tell me|would you please tell me|could you tell me|can you tell me|would you tell me|could you please|can you please|would you please|will you please|please kindly|could you kindly|can you kindly|i was wondering if you could|would you mind|do you mind|can you|could you|would you|will you|please|kindly|i'd like you to|i want you to|tell me|just)\s+/i;

      const politeMatch = str.match(politenessPattern);
      if (politeMatch && politeMatch[0].length > 0) {
        removedMarkers.push(politeMatch[0].trim());
        str = str.slice(politeMatch[0].length).trim();
        changed = true;
      }
    }

    // Trailing politeness: e.g. "..., please", "..., thank you"
    str = str.replace(/[,]?\s*(?:please|thanks|thank you|kindly)$/i, '').trim();

    return { cleaned: str, removedMarkers };
  }

  /**
   * Parses social conversational utterances (greetings, gratitude, farewells, identity).
   */
  private static parseSocial(
    cleaned: string,
    raw: string,
    owner: string
  ): { domain: ConversationalDomain; intent: string; skill: string; directResponse?: string } | null {
    const lower = cleaned.toLowerCase();

    // Gratitude
    if (/^(?:thank you(?: so much| very much)?|thanks(?: a lot| very much)?|appreciate it|much appreciated)$/i.test(lower)) {
      return {
        domain: 'social',
        intent: 'gratitude',
        skill: 'greeting',
        directResponse: `You're most welcome, ${owner}. Always standing by.`,
      };
    }

    // Farewells
    if (/^(?:good night|goodnight|bye|goodbye|see you(?: later)?|heading to bed|going to sleep)$/i.test(lower)) {
      return {
        domain: 'social',
        intent: 'farewell',
        skill: 'greeting',
        directResponse: `Good night, ${owner}. Rest well, and I'll be here whenever you need me.`,
      };
    }

    // Identity inquiries
    if (/^(?:who are you|what is your name|what are you|tell me about yourself)$/i.test(lower)) {
      return {
        domain: 'social',
        intent: 'identity',
        skill: 'system-info',
        directResponse: `I am ${config.assistantName}, your personal AI assistant. I assist you with intelligent automation, memory, daily briefings, and technical operations.`,
      };
    }

    // Direct Greetings
    if (/^(?:good morning|good afternoon|good evening|hello|hey|hi)$/i.test(lower)) {
      return {
        domain: 'greeting',
        intent: 'greet',
        skill: 'greeting',
      };
    }

    return null;
  }

  /**
   * Parses control keywords (stop, pause, shut up, disabled app launch).
   */
  private static parseControl(cleaned: string): { intent: string } | null {
    if (/^(?:open|launch|start|run)\s+(?:the\s+)?(?:calculator|calc|notepad|spotify|vscode|code|paint|terminal|cmd|powershell|browser|app|application|program)(?:\s+.*)?$/i.test(cleaned)) {
      return { intent: 'app_launch_disabled' };
    }
    if (/^(?:stop|pause|cancel|quit|shut up|be quiet|nevermind|silence|halt)$/i.test(cleaned)) {
      return { intent: 'stop' };
    }
    return null;
  }

  /**
   * Parses system status and hardware telemetry requests.
   */
  private static parseSystemStatus(cleaned: string): { intent: string } | null {
    if (/^(?:how are you(?: doing)?|how(?:'?s| is) it going|how are you today)$/i.test(cleaned)) {
      return { intent: 'how_are_you' };
    }
    if (/^(?:system (?:status|info)|how are you running|are you (?:there|awake|alive|online)|hardware status)$/i.test(cleaned)) {
      return { intent: 'system_status' };
    }
    return null;
  }

  /**
   * Synchronously parses personal memories and facts.
   */
  private static parseMemorySync(
    cleaned: string,
    raw: string,
    owner: string
  ): { intent: string; parameters: Record<string, string>; entities: Record<string, any>; directResponse?: string } | null {
    const isRemember =
      /^(?:remember that|remember|don't forget that|don't forget|keep in mind that|keep in mind|save that|note that|note)\s+(.*)$/i.test(raw) ||
      /^(?:i(?:'m| am|m)|i live|i stay|i am based|i'm based|im based)\s+(?:in|from|at)\s+(.*)$/i.test(cleaned) ||
      /^my\s+([a-zA-Z\s]+?)\s+is\s+(.*)$/i.test(cleaned);

    if (isRemember) {
      const fact = FactInterpreter.interpretSync(raw, owner);
      return {
        intent: 'remember_fact',
        parameters: { fact: fact.rawInput, property: fact.key, value: fact.value },
        entities: {
          key: fact.key,
          value: fact.value,
          category: fact.category,
          secondary: fact.secondaryMemories,
        },
        directResponse: fact.confirmation,
      };
    }

    // 2. Recall location
    if (/^(?:where (?:am i from|do i live|am i based)|where is my home)$/i.test(cleaned)) {
      return {
        intent: 'recall_specific',
        parameters: { property: 'location' },
        entities: { property: 'location' },
      };
    }

    // 3. Recall job / profession
    if (/^(?:what do i do(?: for a living)?|what(?:'s| is) my (?:job|profession|career|role))$/i.test(cleaned)) {
      return {
        intent: 'recall_specific',
        parameters: { property: 'profession' },
        entities: { property: 'profession' },
      };
    }

    // 4. Recall specific property
    const recallMatch = cleaned.match(/^(?:do you remember my|what is my|what's my)\s+([a-zA-Z\s]+)$/i);
    if (recallMatch) {
      return {
        intent: 'recall_specific',
        parameters: { property: recallMatch[1].trim() },
        entities: { property: recallMatch[1].trim() },
      };
    }

    // 5. Recall all memories
    if (/^(?:what do you remember about me|what do you remember|what do you know about me|what are my preferences|list my memories|show my memories|what's in my memory)$/i.test(cleaned)) {
      return {
        intent: 'recall_all',
        parameters: {},
        entities: {},
      };
    }

    // 6. Clear all memories
    if (/^(?:clear all memories|forget everything(?: about me)?|wipe (?:all )?memories|clear (?:my )?memory)$/i.test(cleaned)) {
      return {
        intent: 'clear_all',
        parameters: {},
        entities: {},
      };
    }

    // 7. Forget specific fact
    const forgetMatch = cleaned.match(/^(?:forget that|forget my|forget|delete my|delete|remove my|remove)\s+(.*)$/i);
    if (forgetMatch) {
      return {
        intent: 'forget_fact',
        parameters: { key: forgetMatch[1].trim() },
        entities: { key: forgetMatch[1].trim() },
      };
    }

    return null;
  }

  /**
   * Parses personal memories and facts.
   */
  private static async parseMemory(
    cleaned: string,
    raw: string,
    owner: string,
    dbService?: DatabaseService,
    llmService?: LLMService
  ): Promise<{ intent: string; parameters: Record<string, string>; entities: Record<string, any>; directResponse?: string } | null> {
    // 1. Remember statement
    const isRemember =
      /^(?:remember that|remember|don't forget that|don't forget|keep in mind that|keep in mind|save that|note that|note)\s+(.*)$/i.test(raw) ||
      /^(?:i(?:'m| am|m)|i live|i stay|i am based|i'm based|im based)\s+(?:in|from|at)\s+(.*)$/i.test(cleaned) ||
      /^my\s+([a-zA-Z\s]+?)\s+is\s+(.*)$/i.test(cleaned);

    if (isRemember) {
      const fact = await FactInterpreter.interpret(raw, owner, llmService);
      return {
        intent: 'remember_fact',
        parameters: { fact: fact.rawInput, property: fact.key, value: fact.value },
        entities: {
          key: fact.key,
          value: fact.value,
          category: fact.category,
          secondary: fact.secondaryMemories,
        },
        directResponse: fact.confirmation,
      };
    }

    // 2. Recall location
    if (/^(?:where (?:am i from|do i live|am i based)|where is my home)$/i.test(cleaned)) {
      return {
        intent: 'recall_specific',
        parameters: { property: 'location' },
        entities: { property: 'location' },
      };
    }

    // 3. Recall job / profession
    if (/^(?:what do i do(?: for a living)?|what(?:'s| is) my (?:job|profession|career|role))$/i.test(cleaned)) {
      return {
        intent: 'recall_specific',
        parameters: { property: 'profession' },
        entities: { property: 'profession' },
      };
    }

    // 4. Recall specific property
    const recallMatch = cleaned.match(/^(?:do you remember my|what is my|what's my)\s+([a-zA-Z\s]+)$/i);
    if (recallMatch) {
      return {
        intent: 'recall_specific',
        parameters: { property: recallMatch[1].trim() },
        entities: { property: recallMatch[1].trim() },
      };
    }

    // 5. Recall all memories
    if (/^(?:what do you remember about me|what do you remember|what do you know about me|what are my preferences|list my memories|show my memories|what's in my memory)$/i.test(cleaned)) {
      return {
        intent: 'recall_all',
        parameters: {},
        entities: {},
      };
    }

    // 6. Clear all memories
    if (/^(?:clear all memories|forget everything(?: about me)?|wipe (?:all )?memories|clear (?:my )?memory)$/i.test(cleaned)) {
      return {
        intent: 'clear_all',
        parameters: {},
        entities: {},
      };
    }

    // 7. Forget specific fact
    const forgetMatch = cleaned.match(/^(?:forget that|forget my|forget|delete my|delete|remove my|remove)\s+(.*)$/i);
    if (forgetMatch) {
      return {
        intent: 'forget_fact',
        parameters: { key: forgetMatch[1].trim() },
        entities: { key: forgetMatch[1].trim() },
      };
    }

    return null;
  }

  /**
   * Parses daily voice briefings.
   */
  private static parseBriefing(cleaned: string): { intent: string; parameters: Record<string, string> } | null {
    if (/^(?:morning briefing|morning update|morning intelligence)$/i.test(cleaned)) {
      return { intent: 'morning_briefing', parameters: { type: 'morning' } };
    }
    if (/^(?:evening briefing|evening summary|evening update)$/i.test(cleaned)) {
      return { intent: 'evening_briefing', parameters: { type: 'evening' } };
    }
    if (/^(?:brief me|daily briefing|give me (?:my )?briefing|status briefing|briefing)$/i.test(cleaned)) {
      return { intent: 'daily_briefing', parameters: {} };
    }
    return null;
  }

  /**
   * Parses countdown timers.
   * e.g. "set a timer for 10 minutes", "start a 5-minute pasta timer", "timer for half an hour"
   */
  private static parseTimer(cleaned: string): {
    intent: string;
    parameters: Record<string, string>;
    entities: Record<string, any>;
  } | null {
    // Check status
    if (/^(?:how much time is left on (?:my )?timer|timer status|check timer|time left on timer|timer)$/i.test(cleaned)) {
      return { intent: 'check_timer', parameters: {}, entities: {} };
    }

    // Check cancel
    if (/^(?:cancel (?:my )?timer|stop (?:the )?timer|clear (?:my )?timer|delete timer)$/i.test(cleaned)) {
      return { intent: 'cancel_timer', parameters: {}, entities: {} };
    }

    // Check start timer pattern A: "set timer for 10 minutes"
    const patA =
      /^(?:set (?:a )?timer (?:for )?|start (?:a )?timer (?:for )?|timer (?:for )?)(\d+(?:\.\d+)?|half an?|[a-z]+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)(?:\s+(?:for|called)\s+(.+))?$/i;
    let match = cleaned.match(patA);

    // Check start timer pattern B: "set a 5 minute timer for pizza"
    if (!match) {
      const patB =
        /^(?:set (?:a )?|start (?:a )?)(\d+(?:\.\d+)?|half an?|[a-z]+)\s*(-|\s)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\s+timer(?:\s+(?:for|called)\s+(.+))?$/i;
      match = cleaned.match(patB);
    }

    if (match) {
      const rawAmount = match[1].toLowerCase().trim();
      const unit = (match[3] || match[2] || 'minutes').toLowerCase().trim();
      const label = (match[4] || '').trim();

      const numVal = NUMBER_WORDS[rawAmount] !== undefined ? NUMBER_WORDS[rawAmount] : parseFloat(rawAmount) || 1;
      let durationSec = numVal * 60;
      if (unit.startsWith('sec')) durationSec = Math.round(numVal);
      else if (unit.startsWith('hour') || unit.startsWith('hr')) durationSec = Math.round(numVal * 3600);
      else durationSec = Math.round(numVal * 60);

      return {
        intent: 'set_timer',
        parameters: {
          amount: String(numVal),
          unit,
          duration: String(numVal),
          label,
        },
        entities: {
          amount: numVal,
          unit,
          durationSeconds: durationSec,
          label,
        },
      };
    }

    return null;
  }

  /**
   * Parses alarms and reminders.
   * e.g. "wake me up at 7am tomorrow", "remind me to buy milk at 6pm"
   */
  private static parseAlarm(cleaned: string): {
    intent: string;
    parameters: Record<string, string>;
    entities: Record<string, any>;
  } | null {
    // Alarms
    const alarmMatch = cleaned.match(/^(?:set (?:an? )?alarm (?:for|at)|wake me up at|wake me up)\s*(.*)$/i);
    if (alarmMatch) {
      const rawTime = alarmMatch[1].trim();
      return {
        intent: 'set_alarm',
        parameters: { time: rawTime || '7:00 AM' },
        entities: { time: rawTime || '7:00 AM' },
      };
    }

    // Reminders
    const remindMatch = cleaned.match(/^(?:remind me to|reminder to|remind me)\s+(.*)$/i);
    if (remindMatch) {
      const rawTask = remindMatch[1].trim();
      // Inspect if ends with "at [time]"
      const atSplit = rawTask.match(/^(.*?)\s+(?:at|for)\s+([0-9]+(?::[0-9]+)?\s*(?:am|pm)?)$/i);
      if (atSplit) {
        return {
          intent: 'set_reminder',
          parameters: { task: atSplit[1].trim(), time: atSplit[2].trim() },
          entities: { task: atSplit[1].trim(), time: atSplit[2].trim() },
        };
      }
      return {
        intent: 'set_reminder',
        parameters: { task: rawTask },
        entities: { task: rawTask },
      };
    }

    return null;
  }

  /**
   * Parses tasks, todos, and checklists.
   */
  private static parseTodo(cleaned: string): {
    intent: string;
    parameters: Record<string, string>;
    entities: Record<string, any>;
  } | null {
    // List tasks
    if (/^(?:what are my (?:tasks?|todos?|notes?)|show (?:my )?(?:tasks?|todos?|todo list|notes?)|list (?:my )?(?:tasks?|todos?|notes?)|what(?:'s| is) on my (?:agenda|tasks?|todo list)|my (?:tasks?|todos?))$/i.test(cleaned)) {
      return { intent: 'list_tasks', parameters: {}, entities: {} };
    }

    // Clear completed
    if (/^(?:clear (?:all )?completed tasks|clear completed (?:todos|tasks))$/i.test(cleaned)) {
      return { intent: 'clear_completed', parameters: {}, entities: {} };
    }

    // Complete task: "mark task 1 as done", "complete task 1"
    const completeMatch = cleaned.match(/^(?:complete|finish|done|mark as done)\s+(?:task\s+)?(\d+)$/i) ||
      cleaned.match(/^mark task (\d+) as (?:done|completed)$/i);
    if (completeMatch) {
      return {
        intent: 'complete_task',
        parameters: { id: completeMatch[1] },
        entities: { id: parseInt(completeMatch[1], 10) },
      };
    }

    // Delete task: "delete task 2"
    const deleteMatch = cleaned.match(/^(?:delete|remove)\s+task\s+(\d+)$/i);
    if (deleteMatch) {
      return {
        intent: 'delete_task',
        parameters: { id: deleteMatch[1] },
        entities: { id: parseInt(deleteMatch[1], 10) },
      };
    }

    // Add task: "add review pull request to my tasks", "new task: finish report"
    const addMatchA = cleaned.match(/^(?:add|put)\s+(.*)\s+(?:to my (?:todo list|tasks?|notes?)|on my (?:todo list|tasks?|notes?))$/i);
    if (addMatchA) {
      const title = addMatchA[1].trim();
      return {
        intent: 'add_task',
        parameters: { title, task: title },
        entities: { title },
      };
    }

    const addMatchB = cleaned.match(
      /^(?:add (?:a )?(?:new )?(?:task|todo|note)|new (?:task|todo|note):?|(?:task|todo|note):)\s+(.*)$/i
    );
    if (addMatchB) {
      const title = addMatchB[1].trim();
      return {
        intent: 'add_task',
        parameters: { title, task: title },
        entities: { title },
      };
    }

    return null;
  }

  /**
   * Parses weather inquiries.
   */
  private static parseWeather(
    cleaned: string,
    dbService?: DatabaseService
  ): { parameters: Record<string, string>; entities: Record<string, any> } | null {
    const weatherPattern =
      /^(?:what(?:'?s| is) the weather(?:\s+like)?|what the weather is(?:\s+like)?|how(?:'?s| is) the weather|how the weather is|weather forecast|weather|is it (?:going to )?rain(?:ing)?|temperature)(?:\s+(?:for|in|at)\s+(.*))?$/i;

    const match = cleaned.match(weatherPattern);
    if (match) {
      let loc = (match[1] || '').trim();
      // Strip conversational trailing time/date markers like "right now", "today", "currently"
      loc = loc.replace(/\s+(?:right now|currently|today|at the moment|this morning|this evening)$/i, '').trim();

      if (!loc && dbService) {
        try {
          const memories = dbService.getAllMemories();
          loc = memories['city'] || (memories['location'] ? memories['location'].split(',')[0].trim() : '');
        } catch {
          // ignore
        }
      }

      return {
        parameters: { location: loc },
        entities: { location: loc },
      };
    }

    return null;
  }

  /**
   * Parses world time and date requests.
   */
  private static parseTime(cleaned: string): {
    intent: string;
    parameters: Record<string, string>;
    entities: Record<string, any>;
  } | null {
    // Date
    if (/^(?:what(?:'?s| is) today(?:'?s)? date|what is the date|what day is it|today(?:'?s)? date)(?:\s+in\s+(.*))?$/i.test(cleaned)) {
      const match = cleaned.match(/\bin\s+(.*)$/i);
      let loc = match ? match[1].trim() : '';
      loc = loc.replace(/\s+(?:right now|currently|today|at the moment)$/i, '').trim();
      return {
        intent: 'get_date',
        parameters: { location: loc },
        entities: { location: loc },
      };
    }

    // Time
    const timeMatch =
      cleaned.match(/^(?:what(?:'?s| is) the time|what time is it|what time it is|tell me the time|current time|the time)(?:\s+in\s+(.*))?$/i) ||
      cleaned.match(/^time in (.*)$/i);

    if (timeMatch) {
      let loc = (timeMatch[1] || '').trim();
      loc = loc.replace(/\s+(?:right now|currently|today|at the moment)$/i, '').trim();
      return {
        intent: 'get_time',
        parameters: { location: loc },
        entities: { location: loc },
      };
    }

    return null;
  }

  /**
   * Parses music requests.
   */
  private static parseMusic(cleaned: string): {
    intent?: string;
    parameters: Record<string, string>;
    entities: Record<string, any>;
  } | null {
    // Control commands
    if (/^(?:pause music|pause the music|pause song|pause track)$/i.test(cleaned)) {
      return { intent: 'pause_music', parameters: {}, entities: {} };
    }
    if (/^(?:resume music|resume the music|resume song|resume track|unpause music)$/i.test(cleaned)) {
      return { intent: 'resume_music', parameters: {}, entities: {} };
    }
    if (/^(?:stop music|stop the music|stop song|stop playback)$/i.test(cleaned)) {
      return { intent: 'stop_music', parameters: {}, entities: {} };
    }
    if (/^(?:next song|next track|skip song|skip track)$/i.test(cleaned)) {
      return { intent: 'next_music', parameters: {}, entities: {} };
    }

    const match = cleaned.match(
      /^(?:play|plaay|ply|paly|playy|plsy|playe|put\s+on|turn\s+on|listen\s+to|start\s+playing)(?:\s+(?:some\s+|a\s+)?(?:music|song))?\s*(.*)$/i
    );
    if (match) {
      let query = match[1].trim();
      let platform = 'youtube';

      const spotifyRegex = /\b(?:on\s+)?(?:spotify|spotfy|spoti|spotif|spotofy|spottify|spotiify)\b/gi;
      const youtubeRegex = /\b(?:on\s+)?(?:youtube|yt|youtub|youtbe|yuotube|youtubee|yotube)\b/gi;

      if (spotifyRegex.test(query)) {
        platform = 'spotify';
        query = query.replace(spotifyRegex, '').trim();
      } else if (youtubeRegex.test(query)) {
        platform = 'youtube';
        query = query.replace(youtubeRegex, '').trim();
      }

      return {
        intent: 'play_music',
        parameters: { query, platform },
        entities: { query, platform },
      };
    }
    return null;
  }
}
