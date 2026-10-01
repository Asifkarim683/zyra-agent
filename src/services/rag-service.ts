import crypto from 'crypto';
import type { DatabaseService } from './database.js';
import {
  EmbeddingService,
  embeddingService,
  cosineSimilarity,
  bufferToFloat32Array,
} from './embedding-service.js';
import { logger } from '../config/logger.js';

export interface SearchResultChunk {
  id: string;
  title: string;
  source: string;
  content: string;
  score: number;
}

export interface SemanticMemoryMatch {
  key: string;
  value: string;
  category: string;
  score: number;
}

/**
 * Service orchestrating Document RAG (Retrieval-Augmented Generation)
 * and semantic long-term memory retrieval using SQLite and local vector embeddings.
 */
export class RAGService {
  private db: DatabaseService;
  private embedder: EmbeddingService;

  constructor(db: DatabaseService, embedder: EmbeddingService = embeddingService) {
    this.db = db;
    this.embedder = embedder;
  }

  /**
   * Splits arbitrary text or markdown into semantic chunks with overlap.
   */
  public splitIntoChunks(text: string, chunkSize = 600, overlap = 80): string[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (cleanText.length <= chunkSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    // Split by paragraphs first
    const paragraphs = cleanText.split(/\n{2,}/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length <= chunkSize) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      } else {
        // If currentChunk is substantial, save it
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        // If the paragraph itself is huge, split it by sentence
        if (para.length > chunkSize) {
          const sentences = para.split(/(?<=[.!?])\s+/);
          let subChunk = '';
          for (const s of sentences) {
            if ((subChunk + ' ' + s).length <= chunkSize) {
              subChunk = subChunk ? subChunk + ' ' + s : s;
            } else {
              if (subChunk.trim()) chunks.push(subChunk.trim());
              subChunk = s;
            }
          }
          currentChunk = subChunk;
        } else {
          // Carry over tail of previous chunk for overlap
          const words = currentChunk.split(/\s+/);
          const overlapText = words.slice(-Math.max(1, Math.floor(overlap / 8))).join(' ');
          currentChunk = overlapText ? overlapText + '\n\n' + para : para;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Ingests, embeds, and indexes a text or markdown document into SQLite.
   */
  async ingestDocument(
    title: string,
    content: string,
    source: string
  ): Promise<{ chunkCount: number; source: string }> {
    const cleanTitle = title.trim();
    const cleanSource = source.trim() || cleanTitle;
    const chunks = this.splitIntoChunks(content);

    logger.info(`Ingesting document "${cleanTitle}" (${chunks.length} chunks)...`);

    // Remove existing chunks for this source if re-indexing
    this.db.deleteDocumentBySource(cleanSource);

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const embeddingBuf = await this.embedder.getEmbeddingBuffer(chunkText);
      const chunkId = `${cleanSource}#chunk-${i + 1}-${crypto.randomBytes(4).toString('hex')}`;

      this.db.insertDocumentChunk({
        id: chunkId,
        title: cleanTitle,
        source: cleanSource,
        content: chunkText,
        embedding: embeddingBuf,
      });
    }

    logger.info(`Successfully indexed ${chunks.length} chunks for "${cleanTitle}".`);
    return { chunkCount: chunks.length, source: cleanSource };
  }

  /**
   * Semantically searches the indexed document knowledge base for relevant chunks.
   */
  async searchKnowledgeBase(
    query: string,
    maxResults = 3,
    minScore = 0.42
  ): Promise<SearchResultChunk[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const queryVec = await this.embedder.getEmbedding(cleanQuery);
    const chunks = this.db.getAllDocumentChunks();
    if (chunks.length === 0) return [];

    const scored: SearchResultChunk[] = [];
    for (const chunk of chunks) {
      const docVec = bufferToFloat32Array(chunk.embedding);
      const score = cosineSimilarity(queryVec, docVec);
      if (score >= minScore) {
        scored.push({
          id: chunk.id,
          title: chunk.title,
          source: chunk.source,
          content: chunk.content,
          score,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  /**
   * Stores a user fact or preference alongside its vector embedding for semantic recall.
   */
  async saveSemanticMemory(key: string, value: string, category = 'general'): Promise<void> {
    const embeddingText = `${key}: ${value}`;
    const embeddingBuf = await this.embedder.getEmbeddingBuffer(embeddingText);
    this.db.saveSemanticMemory(key, value, category, embeddingBuf);
    logger.debug(`Saved semantic memory "${key}" with vector embedding.`);
  }

  /**
   * Retrieves semantically relevant memories based on query similarity.
   */
  async searchSemanticMemories(
    query: string,
    maxResults = 3,
    minScore = 0.52
  ): Promise<SemanticMemoryMatch[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      const queryVec = await this.embedder.getEmbedding(cleanQuery);
      const memories = this.db.getAllSemanticMemories();
      if (memories.length === 0) return [];

      const scored: SemanticMemoryMatch[] = [];
      for (const mem of memories) {
        const memVec = bufferToFloat32Array(mem.embedding);
        const score = cosineSimilarity(queryVec, memVec);
        if (score >= minScore) {
          scored.push({
            key: mem.key,
            value: mem.value,
            category: mem.category,
            score,
          });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, maxResults);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Semantic memory lookup failed: ${msg}`);
      return [];
    }
  }

  /**
   * Lists all indexed documents.
   */
  listDocuments() {
    return this.db.listDocuments();
  }

  /**
   * Deletes a document and its chunks.
   */
  deleteDocument(source: string): number {
    return this.db.deleteDocumentBySource(source);
  }
}
