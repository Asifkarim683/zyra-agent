import type { ConversationTurn } from '../types/index.js';
import type { DatabaseService } from '../services/database.js';

/**
 * ConversationManager handles conversation history for context tracking,
 * backed by persistent SQLite storage.
 */
export class ConversationManager {
  private history: Map<string, ConversationTurn[]> = new Map();
  private maxTurns: number;
  private dbService?: DatabaseService;

  /**
   * @param maxTurns Maximum number of turns to keep in memory per conversation (default 10).
   * @param dbService Optional DatabaseService instance for persistent storage.
   */
  constructor(maxTurns: number = 10, dbService?: DatabaseService) {
    this.maxTurns = maxTurns;
    this.dbService = dbService;
  }

  /**
   * Adds a turn to the conversation history (RAM cache + SQLite database).
   * Auto-trims old turns in memory when exceeding maxTurns.
   *
   * @param conversationId The ID of the conversation.
   * @param turn The turn to add.
   * @param intent Optional intent name for auditing.
   */
  public addTurn(conversationId: string, turn: ConversationTurn, intent?: string): void {
    if (!this.history.has(conversationId)) {
      // Warm cache from database if available
      if (this.dbService) {
        const storedTurns = this.dbService.getTurns(conversationId, this.maxTurns);
        this.history.set(conversationId, storedTurns);
      } else {
        this.history.set(conversationId, []);
      }
    }

    const turns = this.history.get(conversationId)!;
    turns.push(turn);

    if (turns.length > this.maxTurns) {
      turns.splice(0, turns.length - this.maxTurns);
    }

    // Persist to SQLite
    if (this.dbService) {
      this.dbService.saveTurn(conversationId, turn, intent);
    }
  }

  /**
   * Retrieves the history for a given conversation.
   * Checks RAM cache, falling back to SQLite if not in memory.
   *
   * @param conversationId The ID of the conversation.
   * @returns An array of conversation turns.
   */
  public getHistory(conversationId: string): ConversationTurn[] {
    if (this.history.has(conversationId)) {
      return this.history.get(conversationId)!;
    }

    if (this.dbService) {
      const storedTurns = this.dbService.getTurns(conversationId, this.maxTurns);
      this.history.set(conversationId, storedTurns);
      return storedTurns;
    }

    return [];
  }

  /**
   * Clears the history for a given conversation both in memory and SQLite.
   *
   * @param conversationId The ID of the conversation.
   */
  public clearHistory(conversationId: string): void {
    this.history.delete(conversationId);
    if (this.dbService) {
      this.dbService.clearHistory(conversationId);
    }
  }
}
