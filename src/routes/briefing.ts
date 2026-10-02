import { Router } from 'express';
import { z } from 'zod';
import { briefingService } from '../container.js';

export const briefingRouter = Router();

const generateBriefingSchema = z.object({
  type: z.enum(['morning', 'evening', 'general']).optional(),
  location: z.string().max(100).optional(),
});

const ackSchema = z.object({
  id: z.string().min(1),
});

/**
 * @route POST /api/v1/briefings/generate
 * @description Generates a fresh, dynamic voice and text briefing.
 */
briefingRouter.post('/generate', async (req, res, next) => {
  try {
    const data = generateBriefingSchema.parse(req.body);
    const briefing = await briefingService.generateBriefing(data.type, data.location);
    res.json(briefing);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/briefings/pending
 * @description Returns pending scheduled voice briefings waiting to be delivered to the client.
 */
briefingRouter.get('/pending', (_req, res) => {
  const pending = briefingService.getPendingNotifications();
  res.json({ pending });
});

/**
 * @route POST /api/v1/briefings/ack
 * @description Acknowledges that a pending voice briefing has been delivered/spoken to the user.
 */
briefingRouter.post('/ack', (req, res, next) => {
  try {
    const { id } = ackSchema.parse(req.body);
    briefingService.markDelivered(id);
    res.json({ success: true, id });
  } catch (error) {
    next(error);
  }
});
