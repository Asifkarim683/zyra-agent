import { Router } from 'express';
import { z } from 'zod';
import { databaseService } from '../container.js';

export const memoryRouter = Router();

const memorySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  category: z.string().optional(),
});

/**
 * @route GET /api/v1/memory
 * @description Retrieves all stored long-term memories and facts about the user.
 */
memoryRouter.get('/', (_req, res) => {
  const memories = databaseService.getAllMemories();
  res.json({
    count: Object.keys(memories).length,
    memories,
  });
});

/**
 * @route POST /api/v1/memory
 * @description Stores or updates a long-term memory.
 */
memoryRouter.post('/', (req, res, next) => {
  try {
    const { key, value, category } = memorySchema.parse(req.body);
    databaseService.setMemory(key, value, category || 'user_preference');
    res.status(201).json({
      message: 'Memory stored successfully',
      key,
      value,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/memory/:key
 * @description Removes a memory fact by key.
 */
memoryRouter.delete('/:key', (req, res) => {
  const key = req.params.key;
  databaseService.deleteMemory(key);
  res.json({
    message: `Memory "${key}" removed`,
  });
});

/**
 * @route GET /api/v1/memory/conversations
 * @description Lists saved conversations and last message preview.
 */
memoryRouter.get('/conversations', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const conversations = databaseService.listConversations(limit);
  res.json({
    conversations,
  });
});

/**
 * @route GET /api/v1/memory/conversations/:id
 * @description Retrieves full turn history for a conversation.
 */
memoryRouter.get('/conversations/:id', (req, res) => {
  const id = req.params.id;
  const turns = databaseService.getTurns(id, 50);
  res.json({
    conversationId: id,
    turns,
  });
});
