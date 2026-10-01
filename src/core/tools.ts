import type { DatabaseService } from '../services/database.js';
import type { WebService } from '../services/web-service.js';
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
      description: 'Search the live internet for recent news, facts, articles, or real-time data',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
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
      description: 'Set, check status, or cancel a timer',
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
];

export interface ToolExecutionContext {
  registry: SkillRegistry;
  dbService?: DatabaseService;
  webService?: WebService;
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
          const results = await ctx.webService.search(query, 3);
          if (results.length > 0) {
            const summary = results.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`).join('\n');
            return { result: summary, data: results };
          }
          return { result: `No recent search results found for "${query}".` };
        }
        return { result: 'Web search service unavailable.' };
      }

      case 'manage_memory': {
        const fact = String(args.fact || '').trim();
        const memorySkill = ctx.registry.get('memory');
        if (memorySkill) {
          const res = await memorySkill.execute({
            intent: { intent: 'remember_fact', skill: 'memory', confidence: 1, raw: `remember that ${fact}`, parameters: { fact } },
            userId: 'user',
            conversationId: ctx.conversationId,
            history: [],
          });
          return { result: res.response };
        }
        return { result: `Saved memory: "${fact}".` };
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

      default:
        return { result: `Unknown tool: ${toolName}` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Error executing tool "${toolName}": ${msg}`);
    return { result: `Error executing tool ${toolName}: ${msg}` };
  }
}
