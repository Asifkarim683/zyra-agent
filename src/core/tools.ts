import type { DatabaseService } from '../services/database.js';
import type { WebService } from '../services/web-service.js';
import type { RAGService } from '../services/rag-service.js';
import type { SandboxService } from '../services/sandbox-service.js';
import type { BriefingService } from '../services/briefing-service.js';
import type { SkillRegistry } from './skill-registry.js';
import { logger } from '../config/logger.js';
import { config } from '../config/index.js';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const TOOL_SCHEMAS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current live real-time weather conditions and temperature for any city worldwide',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name, e.g. London, Tokyo, New York, Paris' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time_or_date',
      description: 'Get current live time or date, optionally in a specific city or time zone',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Optional city name to get time for, e.g. Tokyo, London, Paris' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the live internet for recent news, real-time facts, current prices, or live web information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to lookup on the web' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_webpage',
      description: 'Fetch and extract the readable text content of any safe web page URL (e.g. https://...) to summarize or analyze it.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The web page URL to read' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search long-term memory, saved documents, project notes, and knowledge base for relevant facts, project context, or past information.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query or concept to look up in the knowledge base' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_memory',
      description: 'Remember a personal fact, habit, or preference about Eren to recall in future conversations',
      parameters: {
        type: 'object',
        properties: {
          fact: { type: 'string', description: 'The personal fact or preference to remember' },
        },
        required: ['fact'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_timer',
      description: 'Manage countdown timers for minutes or seconds: set a timer, check remaining time, or cancel an active timer. Do NOT use for calculation or math.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['set', 'status', 'cancel'], description: 'Action to perform' },
          durationSeconds: { type: 'number', description: 'Duration in seconds (e.g. 300 for 5 minutes)' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'manage_tasks',
      description: 'Add, list, or complete to-do tasks for Eren',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list', 'complete'], description: 'Task action' },
          task: { type: 'string', description: 'Task text when adding or completing' },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_calculation_or_code',
      description: 'Execute a sandboxed JavaScript mathematical expression or calculation script. Use this whenever Eren asks for mathematical calculations, arithmetic, formulas, percentages, statistical analysis, unit conversions, loan/interest calculations, or date computations to guarantee 100% precision.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The JavaScript mathematical expression or script to evaluate, e.g. "compoundInterest(10000, 0.07, 12, 10)" or "2 * Math.PI * 6371" or "daysBetween(\'2026-01-01\', \'2026-10-02\')"' },
          description: { type: 'string', description: 'Brief explanation of the calculation' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_voice_briefing',
      description: 'Generate a comprehensive live daily voice briefing for Eren covering weather, pending to-dos, top news headlines, and system hardware status.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['morning', 'evening', 'general'], description: 'Type of briefing' },
          location: { type: 'string', description: 'Optional location for weather' },
        },
      },
    },
  },
];

/**
 * Selects only the strictly relevant tools for a given user prompt.
 * Avoids injecting heavy tool schemas for standard conversational turns,
 * eliminating 800ms+ prompt eval overhead and preventing false-positive tool calls.
 */
export function getToolsForPrompt(prompt: string): ToolDefinition[] {
  const p = prompt.toLowerCase();

  // Explicit internet / search requests & live real-time queries
  const isSearchRequested = /\b(search\s+(?:the\s+web|online|internet|google)|search\s+for|look\s*up\s+online|browse\s+the\s+web|latest\s+news|breaking\s+news|recent\s+headlines?|today's\s+news|current\s+events|who\s+won|stock\s+price|bitcoin|crypto|current\s+prime\s+minister|current\s+president|what\s+happened\s+today|news\s+about|news\s+on)\b/i.test(p);

  // Direct webpage URL extraction
  const hasUrl = /https?:\/\/[^\s<>"'{}|\^\[\]`]+/i.test(prompt);

  // Knowledge base and document Q&A requests
  const isKnowledgeRequested = /\b(document|documents|notes?|knowledge\s*base|pdf|uploaded|project\s+doc|spec|specification|manual|read\s+my\s+note|in\s+my\s+doc|look\s+up\s+in\s+docs)\b/i.test(p);

  // Real-time weather requests
  const isWeatherRequested = /\b(weather|temperature|forecast|degrees|raining|snowing|humid|sunny|windy|rain|snow)\b/i.test(p);

  // Real-time clock / time / date requests
  const isTimeRequested = /\b(what\s+time|current\s+time|what's\s+the\s+time|what\s+date|what\s+day\s+is\s+it|time\s+in|timezone|clock)\b/i.test(p);

  // Timer / countdown requests
  const isTimerRequested = /\b(timer|countdown|stopwatch)\b/i.test(p);

  // Task / todo requests
  const isTaskRequested = /\b(task|todo|to-do|checklist)\b/i.test(p);

  // Explicit memory requests
  const isMemoryRequested = /\b(remember\s+that|don't\s+forget\s+that|keep\s+in\s+mind|store\s+this\s+fact|my\s+favorite)\b/i.test(p);

  // Math, calculations, finance, conversions, and code execution
  const isMathRequested =
    /\b(calculate|computation|compute|math|formula|equation|sum|average|mean|median|stddev|standard\s+deviation|percentage|percent|compound\s+interest|interest\s+rate|loan|monthly\s+payment|factorial|convert|fahrenheit|celsius|kilometers|miles|days\s+between|how\s+many\s+days|sandbox|eval|run\s+code|execute\s+code)\b|[\d\.]+\s*[\+\-\*\/\^\%]\s*[\d\.]+/i.test(
      p
    );

  // Daily voice briefing requests
  const isBriefingRequested = /\b(briefing|brief\s+me|daily\s+summary|morning\s+update|evening\s+update)\b/i.test(p);

  const matched: ToolDefinition[] = [];

  if (isWeatherRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'get_weather');
    if (t) matched.push(t);
  }
  if (isTimeRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'get_time_or_date');
    if (t) matched.push(t);
  }
  if (isSearchRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'search_web');
    if (t) matched.push(t);
  }
  if (hasUrl) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'read_webpage');
    if (t) matched.push(t);
  }
  if (isKnowledgeRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'search_knowledge_base');
    if (t) matched.push(t);
  }
  if (isTimerRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'manage_timer');
    if (t) matched.push(t);
  }
  if (isTaskRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'manage_tasks');
    if (t) matched.push(t);
  }
  if (isMemoryRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'manage_memory');
    if (t) matched.push(t);
  }
  if (isMathRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'execute_calculation_or_code');
    if (t) matched.push(t);
  }
  if (isBriefingRequested) {
    const t = TOOL_SCHEMAS.find((s) => s.function.name === 'get_voice_briefing');
    if (t) matched.push(t);
  }

  return matched;
}

export interface ToolExecutionContext {
  registry: SkillRegistry;
  dbService?: DatabaseService;
  webService?: WebService;
  ragService?: RAGService;
  sandboxService?: SandboxService;
  briefingService?: BriefingService;
  conversationId: string;
}

/**
 * Dispatches a tool invocation to the appropriate skill or service.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ToolExecutionContext
): Promise<{ result: string; data?: any }> {
  logger.info(`Executing tool "${toolName}" with args:`, args);

  try {
    switch (toolName) {
      case 'get_weather': {
        const city = String(args.city || '').trim();
        const weatherSkill = ctx.registry.get('weather');
        if (weatherSkill) {
          const res = await weatherSkill.execute({
            intent: { intent: 'check_weather', skill: 'weather', confidence: 1, raw: `weather in ${city}`, parameters: { location: city } },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          return { result: res.response, data: res.data };
        }
        return { result: `Weather service currently unavailable for ${city}.` };
      }

      case 'get_time_or_date': {
        const location = String(args.location || '').trim();
        const timeSkill = ctx.registry.get('time');
        if (timeSkill) {
          const res = await timeSkill.execute({
            intent: { intent: 'get_time', skill: 'time', confidence: 1, raw: location ? `time in ${location}` : 'current time', parameters: { location } },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          return { result: res.response };
        }
        return { result: `Current time is ${new Date().toLocaleTimeString()}.` };
      }

      case 'search_web': {
        const query = String(args.query || '').trim();
        if (ctx.webService) {
          const results = await ctx.webService.search(query, 4);
          if (results.length > 0) {
            const summary = results.map((r, i) => `[${i + 1}] ${r.title} (${r.domain || r.url})\n${r.snippet}`).join('\n\n');
            return { result: summary, data: { sources: results } };
          }
          return { result: `No recent search results found for "${query}".` };
        }
        return { result: 'Web search service unavailable.' };
      }

      case 'read_webpage': {
        const url = String(args.url || '').trim();
        if (ctx.webService) {
          try {
            const page = await ctx.webService.extractUrl(url);
            let domain = '';
            try {
              domain = new URL(page.url).hostname.replace(/^www\./, '');
            } catch {
              domain = '';
            }
            return {
              result: `Title: ${page.title}\nURL: ${page.url}\n\nContent:\n${page.content.slice(0, 3000)}`,
              data: {
                sources: [{ title: page.title, url: page.url, snippet: page.content.slice(0, 200), domain }],
              },
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { result: `Failed to read webpage: ${msg}` };
          }
        }
        return { result: 'Web service unavailable.' };
      }

      case 'search_knowledge_base': {
        const query = String(args.query || '').trim();
        if (ctx.ragService) {
          try {
            const chunks = await ctx.ragService.searchKnowledgeBase(query, 3, 0.42);
            if (chunks.length > 0) {
              const summary = chunks.map((c, i) => `[Document Excerpt ${i + 1} from "${c.title}"]\n${c.content}`).join('\n\n');
              return { result: summary, data: { knowledge: chunks } };
            }
            return { result: `No matching documents found in knowledge base for "${query}".` };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { result: `Error searching knowledge base: ${msg}` };
          }
        }
        return { result: 'Knowledge base service unavailable.' };
      }

      case 'manage_memory': {
        const fact = String(args.fact || '').trim();
        const memorySkill = ctx.registry.get('memory');
        let response = `Saved memory: "${fact}".`;
        if (memorySkill) {
          const res = await memorySkill.execute({
            intent: { intent: 'remember_fact', skill: 'memory', confidence: 1, raw: `remember that ${fact}`, parameters: { fact } },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          response = res.response;
        }
        if (ctx.ragService) {
          ctx.ragService.saveSemanticMemory('user_fact', fact).catch((err) => {
            logger.warn(`Failed to save semantic memory embedding: ${err}`);
          });
        }
        return { result: response };
      }

      case 'manage_timer': {
        const action = args.action || 'status';
        const timerSkill = ctx.registry.get('timer');
        if (timerSkill) {
          let intent = 'check_timer';
          let parameters: Record<string, string> = {};
          if (action === 'set') {
            intent = 'set_timer';
            const secs = Number(args.durationSeconds) || 60;
            const mins = Math.round(secs / 60);
            parameters = { duration: `${mins || secs}`, unit: mins > 0 ? 'minutes' : 'seconds' };
          } else if (action === 'cancel') {
            intent = 'cancel_timer';
          }
          const res = await timerSkill.execute({
            intent: { intent, skill: 'timer', confidence: 1, raw: `${action} timer`, parameters },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          return { result: res.response };
        }
        return { result: `Timer ${action} processed.` };
      }

      case 'manage_tasks': {
        const action = args.action || 'list';
        const todoSkill = ctx.registry.get('todo');
        if (todoSkill) {
          let intent = 'list_tasks';
          let parameters: Record<string, string> = {};
          if (action === 'add') {
            intent = 'add_task';
            parameters = { task: String(args.task || 'New task') };
          } else if (action === 'complete') {
            intent = 'complete_task';
            parameters = { task: String(args.task || '') };
          }
          const res = await todoSkill.execute({
            intent: { intent, skill: 'todo', confidence: 1, raw: `${action} task`, parameters },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          return { result: res.response };
        }
        return { result: `Task ${action} processed.` };
      }

      case 'execute_calculation_or_code': {
        const code = String(args.code || '').trim();
        if (ctx.sandboxService) {
          const evalRes = ctx.sandboxService.execute(code);
          if (evalRes.success) {
            return {
              result: `Calculated successfully: ${evalRes.formattedResult}`,
              data: {
                calculation: {
                  code,
                  result: evalRes.result,
                  formattedResult: evalRes.formattedResult,
                  logs: evalRes.logs,
                  executionTimeMs: evalRes.executionTimeMs,
                },
              },
            };
          } else {
            return {
              result: `Calculation error: ${evalRes.error}`,
              data: {
                calculation: {
                  code,
                  error: evalRes.error,
                  logs: evalRes.logs,
                  executionTimeMs: evalRes.executionTimeMs,
                },
              },
            };
          }
        }
        return { result: 'Calculation sandbox service unavailable.' };
      }

      case 'get_voice_briefing': {
        if (ctx.briefingService) {
          const type = args.type as ('morning' | 'evening' | 'general') | undefined;
          const loc = args.location as string | undefined;
          const briefing = await ctx.briefingService.generateBriefing(type, loc, false);
          return {
            result: briefing.displayText,
            data: {
              briefing,
            },
          };
        }
        return { result: 'Voice briefing service unavailable.' };
      }

      default:
        return { result: `Unknown tool: ${toolName}` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Error executing tool "${toolName}": ${msg}`);
    return { result: `Error executing tool ${toolName}: ${msg}` };
  }
}
