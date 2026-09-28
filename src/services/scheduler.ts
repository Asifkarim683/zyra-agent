import cron from 'node-cron';
import { logger } from '../config/logger.js';
import type { RoutineConfig, SkillResult } from '../types/index.js';
import type { SkillRegistry } from '../core/skill-registry.js';

/**
 * Cron Scheduler Service for managing and executing routines.
 * Routines call skills directly via the SkillRegistry — bypassing the LLM entirely,
 * as per the PRD: deterministic and reliable.
 */
export class SchedulerService {
  private routines: Map<string, RoutineConfig> = new Map();
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private skillRegistry: SkillRegistry;

  constructor(skillRegistry: SkillRegistry) {
    this.skillRegistry = skillRegistry;
  }

  /**
   * Schedules all enabled routines.
   * @param routines Array of routines to load.
   */
  public loadRoutines(routines: RoutineConfig[]): void {
    for (const routine of routines) {
      this.addRoutine(routine);
    }
  }

  /**
   * Adds and schedules a single routine.
   * @param routine The routine to add.
   */
  public addRoutine(routine: RoutineConfig): void {
    this.routines.set(routine.id, routine);

    if (routine.enabled) {
      const job = cron.schedule(routine.cronExpression, async () => {
        logger.info(`Running scheduled routine: ${routine.name} (${routine.id})`);
        await this.executeRoutineActions(routine);
      });
      this.activeJobs.set(routine.id, job);
      logger.info(`Scheduled routine: ${routine.name} with cron ${routine.cronExpression}`);
    } else {
      logger.info(`Routine added but disabled: ${routine.name} (${routine.id})`);
    }
  }

  /**
   * Removes and unschedules a routine.
   * @param id The routine ID.
   */
  public removeRoutine(id: string): void {
    const job = this.activeJobs.get(id);
    if (job) {
      job.stop();
      this.activeJobs.delete(id);
    }
    this.routines.delete(id);
    logger.info(`Removed routine: ${id}`);
  }

  /**
   * Manually runs a routine's actions.
   * @param id The routine ID.
   * @returns Array of skill execution results.
   */
  public async triggerRoutine(id: string): Promise<SkillResult[]> {
    const routine = this.routines.get(id);
    if (!routine) {
      throw new Error(`Routine with id ${id} not found`);
    }
    logger.info(`Manually triggering routine: ${routine.name} (${routine.id})`);
    return this.executeRoutineActions(routine);
  }

  /**
   * Lists all routines.
   * @returns Array of all configured routines.
   */
  public getRoutines(): RoutineConfig[] {
    return Array.from(this.routines.values());
  }

  /**
   * Executes the actions of a routine sequentially.
   * @param routine The routine to execute.
   * @returns Array of skill results.
   */
  private async executeRoutineActions(routine: RoutineConfig): Promise<SkillResult[]> {
    const results: SkillResult[] = [];

    for (const action of routine.actions) {
      try {
        const skill = this.skillRegistry.get(action.skill);
        if (!skill) {
          throw new Error(`Skill "${action.skill}" not found in registry`);
        }

        logger.debug(`Executing skill ${action.skill} for routine ${routine.name}`);
        const result = await skill.execute({
          intent: {
            intent: action.intent,
            confidence: 1.0,
            skill: action.skill,
            parameters: action.parameters,
            raw: '',
          },
          userId: 'system',
          conversationId: `routine-${routine.id}`,
          history: [],
        });
        results.push(result);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Error executing skill ${action.skill} for routine ${routine.name}: ${msg}`);
        results.push({
          response: `Error: ${msg}`,
          action: 'error',
        });
      }
    }

    return results;
  }
}
