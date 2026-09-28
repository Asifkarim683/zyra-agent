import { Router } from 'express';
import { z } from 'zod';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { schedulerService } from '../container.js';
import type { RoutineConfig } from '../types/index.js';

export const routinesRouter = Router();

const routineActionSchema = z.object({
  skill: z.string().trim().min(1, 'Skill name is required').max(100),
  intent: z.string().trim().max(100).default(''),
  parameters: z.record(z.string().max(500)).default({}),
});

const routineSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  cronExpression: z
    .string()
    .trim()
    .min(1, 'Cron expression is required')
    .refine((expr) => cron.validate(expr), {
      message: 'Invalid cron expression format (must follow standard 5-part cron syntax)',
    }),
  actions: z.array(routineActionSchema).min(1, 'At least one action is required').max(10, 'Maximum 10 actions per routine'),
  enabled: z.boolean().default(true),
});

/**
 * @route GET /api/v1/routines
 * @description Lists all configured routines.
 */
routinesRouter.get('/', (_req, res) => {
  const routines = schedulerService.getRoutines();
  res.json(routines);
});

/**
 * @route POST /api/v1/routines
 * @description Creates and schedules a new routine.
 */
routinesRouter.post('/', (req, res, next) => {
  try {
    const routineData = routineSchema.parse(req.body);
    const newRoutine: RoutineConfig = {
      id: uuidv4(),
      ...routineData,
    };
    schedulerService.addRoutine(newRoutine);
    res.status(201).json(newRoutine);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /api/v1/routines/:id
 * @description Updates an existing routine.
 */
routinesRouter.patch('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const partialSchema = routineSchema.partial();
    const updateData = partialSchema.parse(req.body);

    const routines = schedulerService.getRoutines();
    const existing = routines.find((r) => r.id === id);

    if (!existing) {
      res.status(404).json({ error: 'Routine not found', status: 404 });
      return;
    }

    const updatedRoutine: RoutineConfig = {
      ...existing,
      ...updateData,
      id: existing.id,
      actions: updateData.actions || existing.actions,
    };

    schedulerService.removeRoutine(id);
    schedulerService.addRoutine(updatedRoutine);

    res.json(updatedRoutine);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/routines/:id
 * @description Deletes and unschedules a routine.
 */
routinesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  schedulerService.removeRoutine(id);
  res.status(204).send();
});

/**
 * @route POST /api/v1/routines/:id/trigger
 * @description Manually triggers a routine.
 */
routinesRouter.post('/:id/trigger', async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await schedulerService.triggerRoutine(id);
    res.json({ id, results });
  } catch (error) {
    next(error);
  }
});
