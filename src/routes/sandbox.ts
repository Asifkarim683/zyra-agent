import { Router } from 'express';
import { z } from 'zod';
import { sandboxService } from '../container.js';

export const sandboxRouter = Router();

const executeSchema = z.object({
  code: z.string().min(1, 'Code snippet cannot be empty').max(5000, 'Code snippet cannot exceed 5000 characters'),
});

/**
 * @route POST /api/v1/sandbox/execute
 * @description Executes a sandboxed JavaScript mathematical or computational code snippet.
 */
sandboxRouter.post('/execute', (req, res, next) => {
  try {
    const { code } = executeSchema.parse(req.body);
    const result = sandboxService.execute(code);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
