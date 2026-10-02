import { BaseSkill } from './base-skill.js';
import type { IntentPattern, SkillContext, SkillResult } from '../core/skill-registry.js';
import type { DatabaseService } from '../services/database.js';
import { logger } from '../config/logger.js';

/**
 * Skill allowing Zyra to manage tasks, todos, and quick notes persistently in SQLite.
 */
export class TodoSkill extends BaseSkill {
  name = 'todo';
  description = 'Manages persistent tasks, todos, and quick notes in SQLite';

  private dbService?: DatabaseService;

  constructor(dbService?: DatabaseService) {
    super();
    this.dbService = dbService;
  }

  patterns: IntentPattern[] = [
    {
      pattern: /^(?:add|put) (.*) (?:to my (?:todo list|tasks?|notes?)|on my (?:todo list|tasks?|notes?))$/i,
      intent: 'add_task',
      extractParams: (match) => ({ title: match[1].trim() }),
    },
    {
      pattern: /^(?:new (?:task|todo|note):?|(?:task|todo|note):)\s+(.*)$/i,
      intent: 'add_task',
      extractParams: (match) => ({ title: match[1].trim() }),
    },
    {
      pattern: /^(?:add (?:a )?(?:new )?(?:task|todo|note)|new (?:task|todo|note))\s+(.*)$/i,
      intent: 'add_task',
      extractParams: (match) => ({ title: match[1].trim() }),
    },
    {
      pattern: /^(?:what are my (?:tasks?|todos?|notes?)|show (?:my )?(?:tasks?|todos?|todo list|notes?)|list (?:my )?(?:tasks?|todos?|notes?)|my (?:tasks?|todos?))$/i,
      intent: 'list_tasks',
    },
    {
      pattern: /^(?:complete|finish|done) task (\d+)$/i,
      intent: 'complete_task',
      extractParams: (match) => ({ id: match[1] }),
    },
    {
      pattern: /^mark task (\d+) as (?:done|completed)$/i,
      intent: 'complete_task',
      extractParams: (match) => ({ id: match[1] }),
    },
    {
      pattern: /^(?:delete|remove) task (\d+)$/i,
      intent: 'delete_task',
      extractParams: (match) => ({ id: match[1] }),
    },
    {
      pattern: /^(?:clear (?:all )?completed tasks|clear completed (?:todos|tasks))$/i,
      intent: 'clear_completed',
    },
  ];

  async execute(context: SkillContext): Promise<SkillResult> {
    const intent = context.intent.intent;

    if (!this.dbService) {
      return this.success("I don't have access to my database right now.");
    }

    // 1. ADD TASK
    if (intent === 'add_task') {
      const title = (context.intent.parameters?.title || '').trim();
      if (!title) {
        return this.success('What would you like me to add to your tasks?');
      }

      const task = this.dbService.addTask(title);
      logger.info(`Added task #${task.id}: "${task.title}"`);
      return this.success(`Added "${task.title}" to your tasks (Task #${task.id}).`);
    }

    // 2. LIST TASKS
    if (intent === 'list_tasks') {
      const tasks = this.dbService.getTasks();
      if (tasks.length === 0) {
        return this.success("Your task list is clear! You don't have any pending tasks right now.");
      }

      const pending = tasks.filter((t) => !t.completed);
      const completed = tasks.filter((t) => t.completed);

      const lines: string[] = [];
      if (pending.length > 0) {
        lines.push('Pending Tasks:');
        for (const t of pending) {
          lines.push(`• [#${t.id}] ${t.title}`);
        }
      }

      if (completed.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(`Completed (${completed.length}):`);
        for (const t of completed.slice(0, 5)) {
          lines.push(`✓ [#${t.id}] ${t.title}`);
        }
      }

      return this.success(`Here are your current tasks:\n${lines.join('\n')}`);
    }

    // 3. COMPLETE TASK
    if (intent === 'complete_task') {
      const idNum = parseInt(context.intent.parameters?.id || '0', 10);
      if (!idNum) {
        return this.success('Please specify a valid task number to complete.');
      }

      const updated = this.dbService.completeTask(idNum);
      if (updated) {
        return this.success(`Marked task #${idNum} as completed. Nice job!`);
      } else {
        return this.success(`I couldn't find task #${idNum} in your list.`);
      }
    }

    // 4. DELETE TASK
    if (intent === 'delete_task') {
      const idNum = parseInt(context.intent.parameters?.id || '0', 10);
      if (!idNum) {
        return this.success('Please specify a valid task number to delete.');
      }

      const deleted = this.dbService.deleteTask(idNum);
      if (deleted) {
        return this.success(`Removed task #${idNum} from your tasks.`);
      } else {
        return this.success(`I couldn't find task #${idNum} in your list.`);
      }
    }

    // 5. CLEAR COMPLETED
    if (intent === 'clear_completed') {
      const count = this.dbService.clearCompletedTasks();
      if (count === 0) {
        return this.success('You have no completed tasks to clear.');
      }
      return this.success(`Cleared ${count} completed ${count === 1 ? 'task' : 'tasks'} from your list.`);
    }

    return this.success("I'm not sure what you'd like me to do with your tasks.");
  }
}
