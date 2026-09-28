import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import type { ConversationTurn, RoutineConfig } from '../types/index.js';

export interface MemoryRecord {
  key: string;
  value: string;
  category: string;
  updated_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

/**
 * SQLite Database Service for persistent storage of:
 * 1. Conversation turns and history
 * 2. Scheduled routines and alarms
 * 3. Long-term user memories and facts
 */
export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string = config.dbPath) {
    // Ensure data directory exists
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    logger.info(`Initializing SQLite database at: ${resolvedPath}`);
    this.db = new Database(resolvedPath);

    // Performance optimizations
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initSchema();
  }

  /**
   * Initializes database tables and indices.
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT 'New Conversation',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        intent TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id);

      CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        actions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS memories (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS automation_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // ==========================================
  // CONVERSATIONS & MESSAGES
  // ==========================================

  /**
   * Saves a conversation turn into SQLite.
   */
  public saveTurn(conversationId: string, turn: ConversationTurn, intent?: string): void {
    const upsertConv = this.db.prepare(`
      INSERT INTO conversations (id, updated_at)
      VALUES (?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `);

    const insertMsg = this.db.prepare(`
      INSERT INTO messages (conversation_id, role, content, timestamp, intent)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      upsertConv.run(conversationId);
      insertMsg.run(
        conversationId,
        turn.role,
        turn.content,
        turn.timestamp ? turn.timestamp.toISOString() : new Date().toISOString(),
        intent || null
      );
    });

    tx();
  }

  /**
   * Retrieves conversation turns from SQLite, ordered by chronological occurrence.
   */
  public getTurns(conversationId: string, limit: number = 20): ConversationTurn[] {
    const stmt = this.db.prepare(`
      SELECT role, content, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);

    const rows = stmt.all(conversationId, limit) as Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;

    // Return in chronological order
    return rows.reverse().map((r) => ({
      role: r.role,
      content: r.content,
      timestamp: new Date(r.timestamp),
    }));
  }

  /**
   * Clears messages for a conversation.
   */
  public clearHistory(conversationId: string): void {
    const stmt = this.db.prepare(`DELETE FROM messages WHERE conversation_id = ?`);
    stmt.run(conversationId);
  }

  /**
   * Lists all recent conversations.
   */
  public listConversations(limit: number = 20): ConversationSummary[] {
    const stmt = this.db.prepare(`
      SELECT 
        c.id, 
        c.title, 
        c.updated_at as updatedAt,
        COALESCE((
          SELECT content FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY id DESC LIMIT 1
        ), '') as lastMessage
      FROM conversations c
      ORDER BY c.updated_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as ConversationSummary[];
  }

  // ==========================================
  // ROUTINES & ALARMS
  // ==========================================

  /**
   * Saves a routine into SQLite.
   */
  public saveRoutine(routine: RoutineConfig): void {
    const stmt = this.db.prepare(`
      INSERT INTO routines (id, name, cron_expression, enabled, actions, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        cron_expression = excluded.cron_expression,
        enabled = excluded.enabled,
        actions = excluded.actions,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      routine.id,
      routine.name,
      routine.cronExpression,
      routine.enabled ? 1 : 0,
      JSON.stringify(routine.actions)
    );
  }

  /**
   * Retrieves all routines from SQLite.
   */
  public getRoutines(): RoutineConfig[] {
    const stmt = this.db.prepare(`SELECT * FROM routines ORDER BY created_at ASC`);
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      cron_expression: string;
      enabled: number;
      actions: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      cronExpression: r.cron_expression,
      enabled: r.enabled === 1,
      actions: JSON.parse(r.actions),
    }));
  }

  /**
   * Deletes a routine from SQLite.
   */
  public deleteRoutine(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM routines WHERE id = ?`);
    stmt.run(id);
  }

  // ==========================================
  // LONG-TERM USER MEMORY & PREFERENCES
  // ==========================================

  /**
   * Stores a persistent fact or preference about the user.
   */
  public setMemory(key: string, value: string, category: string = 'general'): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (key, value, category, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(key.toLowerCase().trim(), value.trim(), category);
  }

  /**
   * Gets a specific memory fact by key.
   */
  public getMemory(key: string): string | null {
    const stmt = this.db.prepare(`SELECT value FROM memories WHERE key = ?`);
    const row = stmt.get(key.toLowerCase().trim()) as { value: string } | undefined;
    return row ? row.value : null;
  }

  /**
   * Retrieves all remembered facts as a key-value dictionary.
   */
  public getAllMemories(): Record<string, string> {
    const stmt = this.db.prepare(`SELECT key, value FROM memories ORDER BY key ASC`);
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  /**
   * Deletes a memory fact by key.
   */
  public deleteMemory(key: string): void {
    const stmt = this.db.prepare(`DELETE FROM memories WHERE key = ?`);
    stmt.run(key.toLowerCase().trim());
  }

  // ==========================================
  // TASKS & TODOS
  // ==========================================

  /**
   * Adds a new task to SQLite.
   */
  public addTask(title: string): { id: number; title: string; completed: boolean } {
    const stmt = this.db.prepare(`INSERT INTO tasks (title) VALUES (?)`);
    const info = stmt.run(title.trim());
    return {
      id: Number(info.lastInsertRowid),
      title: title.trim(),
      completed: false,
    };
  }

  /**
   * Retrieves tasks from SQLite.
   */
  public getTasks(limit = 50): Array<{ id: number; title: string; completed: boolean; createdAt: string }> {
    const stmt = this.db.prepare(`
      SELECT id, title, completed, created_at as createdAt 
      FROM tasks 
      ORDER BY completed ASC, id DESC 
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{ id: number; title: string; completed: number; createdAt: string }>;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      completed: r.completed === 1,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Marks a task as completed.
   */
  public completeTask(id: number): boolean {
    const stmt = this.db.prepare(`UPDATE tasks SET completed = 1 WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Deletes a task by ID.
   */
  public deleteTask(id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM tasks WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Clears all completed tasks.
   */
  public clearCompletedTasks(): number {
    const stmt = this.db.prepare(`DELETE FROM tasks WHERE completed = 1`);
    const result = stmt.run();
    return result.changes;
  }

  // ==========================================
  // SYSTEM AUTOMATION AUDIT LOG
  // ==========================================

  /**
   * Records an automation attempt, confirmation, or execution in SQLite.
   */
  public logAutomationAudit(
    actionId: string,
    actionType: string,
    target: string,
    status: 'staged' | 'confirmed' | 'executed' | 'cancelled' | 'rejected'
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO automation_audit (action_id, action_type, target, status)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(actionId, actionType, target, status);
  }

  /**
   * Retrieves recent automation audit records.
   */
  public getAutomationAuditLogs(limit = 20): Array<{
    id: number;
    actionId: string;
    actionType: string;
    target: string;
    status: string;
    createdAt: string;
  }> {
    const stmt = this.db.prepare(`
      SELECT id, action_id as actionId, action_type as actionType, target, status, created_at as createdAt
      FROM automation_audit
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(limit) as Array<{
      id: number;
      actionId: string;
      actionType: string;
      target: string;
      status: string;
      createdAt: string;
    }>;
  }

  /**
   * Closes database connection cleanly.
   */
  public close(): void {
    this.db.close();
  }
}
