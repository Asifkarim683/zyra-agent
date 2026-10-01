import { Ollama } from 'ollama';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

export const EMBEDDING_MODEL = 'nomic-embed-text';
export const EMBEDDING_DIMENSION = 768;

/**
 * Computes cosine similarity between two Float32Array vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dot / denominator : 0;
}

/**
 * Converts a Float32Array to a Node Buffer for SQLite BLOB storage.
 */
export function float32ArrayToBuffer(array: Float32Array): Buffer {
  return Buffer.from(array.buffer, array.byteOffset, array.byteLength);
}

/**
 * Converts a SQLite BLOB Buffer back to Float32Array with zero copy.
 */
export function bufferToFloat32Array(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
}

/**
 * Service for generating local vector embeddings using Ollama's nomic-embed-text model.
 */
export class EmbeddingService {
  private ollama: Ollama;
  public readonly model: string;

  constructor(host: string = config.ollamaBaseUrl, model: string = EMBEDDING_MODEL) {
    this.ollama = new Ollama({ host });
    this.model = model;
  }

  /**
   * Generates a 768-dimensional normalized embedding vector for the provided text.
   */
  async getEmbedding(text: string): Promise<Float32Array> {
    const clean = text.trim();
    if (!clean) {
      return new Float32Array(EMBEDDING_DIMENSION);
    }

    try {
      const response = await this.ollama.embeddings({
        model: this.model,
        prompt: clean,
      });

      const raw = response.embedding;
      const arr = new Float32Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        arr[i] = raw[i];
      }
      return arr;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Embedding generation failed with model "${this.model}": ${msg}`);
      throw new Error(`Failed to generate embedding: ${msg}`);
    }
  }

  /**
   * Generates an embedding directly as a Node.js Buffer for database persistence.
   */
  async getEmbeddingBuffer(text: string): Promise<Buffer> {
    const embedding = await this.getEmbedding(text);
    return float32ArrayToBuffer(embedding);
  }
}

export const embeddingService = new EmbeddingService();
