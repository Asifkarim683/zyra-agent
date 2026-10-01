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
 * @route POST /api/v1/chat/stream
 * @description Streams a chat message response in real-time via Server-Sent Events (SSE).
 */
chatRouter.post('/stream', async (req, res, next) => {
  try {
    const parsed = chatRequestSchema.parse(req.body);
    const conversationId = parsed.conversationId || uuidv4();

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const sendEvent = (event: string, payload: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent('start', { conversationId });

    const result = await orchestrator.process(parsed.message, conversationId, {
      onToken: (token: string) => {
        sendEvent('token', { token });
      },
      onStatus: (status: string) => {
        sendEvent('status', { status });
      },
    });

    sendEvent('done', {
      conversationId,
      response: result.response,
      intent: result.intent,
      provider: result.provider,
      action: result.action,
      data: result.data,
      speak: result.speak,
      trace: result.trace,
    });

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
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
