import { Router } from 'express';
import { skillRegistry } from '../container.js';

export const skillsRouter = Router();

/**
 * @route GET /api/v1/skills
 * @description Lists all registered skills with names and descriptions.
 */
skillsRouter.get('/', (_req, res) => {
  const skills = skillRegistry.list().map((name) => {
    const handler = skillRegistry.get(name);
    return {
      name,
      description: handler?.description || '',
      patternCount: handler?.patterns?.length || 0,
    };
  });
  res.json(skills);
});
