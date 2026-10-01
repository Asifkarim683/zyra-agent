import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { orchestrator, conversationManager } from '../container.js';

export const chatRouter = Router();

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
  conversationId: z.string().uuid().optional(),
});

/**
 * @route POST /api/v1/chat
 * @description Processes a chat message and returns the response.
 */
chatRouter.post('/', async (req, res, next) => {
  try {
    const parsed = chatRequestSchema.parse(req.body);
    const conversationId = parsed.conversationId || uuidv4();

    const result = await orchestrator.process(parsed.message, conversationId);

    res.json({
      conversationId,
      response: result.response,
      intent: result.intent,
      provider: result.provider,
      action: result.action,
      data: result.data,
      speak: result.speak,
      trace: result.trace,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/chat/:conversationId/history
 * @description Retrieves the conversation history for a given conversation ID.
 */
chatRouter.get('/:conversationId/history', (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const history = conversationManager.getHistory(conversationId);
    res.json({ conversationId, history });
  } catch (error) {
    next(error);
  }
});
