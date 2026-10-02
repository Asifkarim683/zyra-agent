import { Router } from 'express';
import { chatRouter } from './chat.js';
import { healthRouter } from './health.js';
import { skillsRouter } from './skills.js';
import { routinesRouter } from './routines.js';
import { voiceRouter } from './voice.js';
import { memoryRouter } from './memory.js';
import { automationRouter } from './automation.js';
import { telemetryRouter } from './telemetry.js';
import { documentsRouter } from './documents.js';
import { briefingRouter } from './briefing.js';
import { sandboxRouter } from './sandbox.js';

export const routes = Router();

routes.use('/chat', chatRouter);
routes.use('/health', healthRouter);
routes.use('/skills', skillsRouter);
routes.use('/routines', routinesRouter);
routes.use('/voice', voiceRouter);
routes.use('/memory', memoryRouter);
routes.use('/automation', automationRouter);
routes.use('/telemetry', telemetryRouter);
routes.use('/documents', documentsRouter);
routes.use('/briefings', briefingRouter);
routes.use('/sandbox', sandboxRouter);
