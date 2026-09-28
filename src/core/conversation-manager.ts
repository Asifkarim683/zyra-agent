import type { ConversationTurn } from '../types/index.js';

/**
 * ConversationManager handles short-term conversation history
 * for context tracking.
 */
export class ConversationManager {
    private history: Map<string, ConversationTurn[]> = new Map();
    private maxTurns: number;

    /**
     * @param maxTurns Maximum number of turns to keep in history per conversation (default 10).
     */
    constructor(maxTurns: number = 10) {
        this.maxTurns = maxTurns;
    }

    /**
     * Adds a turn to the conversation history.
     * Auto-trims old turns when exceeding maxTurns.
     * 
     * @param conversationId The ID of the conversation.
     * @param turn The turn to add.
     */
    public addTurn(conversationId: string, turn: ConversationTurn): void {
        if (!this.history.has(conversationId)) {
            this.history.set(conversationId, []);
        }
        
        const turns = this.history.get(conversationId)!;
        turns.push(turn);

        if (turns.length > this.maxTurns) {
            turns.splice(0, turns.length - this.maxTurns);
        }
    }

    /**
     * Retrieves the history for a given conversation.
     * 
     * @param conversationId The ID of the conversation.
     * @returns An array of conversation turns.
     */
    public getHistory(conversationId: string): ConversationTurn[] {
        return this.history.get(conversationId) || [];
    }

    /**
     * Clears the history for a given conversation.
     * 
     * @param conversationId The ID of the conversation.
     */
    public clearHistory(conversationId: string): void {
        this.history.delete(conversationId);
    }
}
