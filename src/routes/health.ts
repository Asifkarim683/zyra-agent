import { Router } from 'express';
import { config } from '../config/index.js';
import { skillRegistry } from '../container.js';

export const healthRouter = Router();

/**
 * @route GET /api/v1/health
 * @description Health check endpoint returning system status and info.
 */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    assistant: config.assistantName,
    owner: config.ownerName,
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    llmMode: config.llmMode,
    activeSkills: skillRegistry.list().length,
    timestamp: new Date().toISOString(),
  });
});
