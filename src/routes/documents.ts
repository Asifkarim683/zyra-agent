import { Router } from 'express';
import { z } from 'zod';
import { ragService } from '../container.js';
import { logger } from '../config/logger.js';

export const documentsRouter = Router();

const ingestDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title exceeds max length'),
  content: z.string().trim().min(5, 'Content must have at least 5 characters').max(100000, 'Content exceeds 100,000 characters limit'),
  source: z.string().trim().max(200).optional(),
});

const querySchema = z.object({
  query: z.string().trim().min(1, 'Query parameter is required').max(500),
  limit: z.number().int().min(1).max(10).optional().default(3),
});

/**
 * @route GET /api/v1/documents
 * @description Lists all documents and knowledge files indexed in SQLite vector store.
 */
documentsRouter.get('/', (_req, res, next) => {
  try {
    const docs = ragService.listDocuments();
    res.json({ documents: docs });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/documents
 * @description Ingests, chunks, embeds, and indexes a document into the local knowledge base.
 */
documentsRouter.post('/', async (req, res, next) => {
  try {
    const { title, content, source } = ingestDocumentSchema.parse(req.body);
    const result = await ragService.ingestDocument(title, content, source || title);

    res.status(201).json({
      success: true,
      message: `Document "${title}" indexed successfully with ${result.chunkCount} chunks.`,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/v1/documents/:source
 * @description Deletes a document and its indexed vector chunks.
 */
documentsRouter.delete('/:source', (req, res, next) => {
  try {
    const source = decodeURIComponent(req.params.source);
    const changes = ragService.deleteDocument(source);
    res.json({
      success: true,
      message: `Document "${source}" removed from knowledge base (${changes} chunks deleted).`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/documents/query
 * @description Performs semantic vector similarity search across indexed documents.
 */
documentsRouter.post('/query', async (req, res, next) => {
  try {
    const { query, limit } = querySchema.parse(req.body);
    const matches = await ragService.searchKnowledgeBase(query, limit);

    res.json({
      query,
      results: matches,
    });
  } catch (error) {
    next(error);
  }
});
