import { Router } from 'express';
import { chatRouter } from './chat.js';
import { healthRouter } from './health.js';
import { skillsRouter } from './skills.js';
import { routinesRouter } from './routines.js';
import { voiceRouter } from './voice.js';

export const routes = Router();

routes.use('/chat', chatRouter);
routes.use('/health', healthRouter);
routes.use('/skills', skillsRouter);
routes.use('/routines', routinesRouter);
routes.use('/voice', voiceRouter);
