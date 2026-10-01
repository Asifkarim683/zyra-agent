/**
 * @file Core type definitions for Zyra Assistant
 */

/**
 * Represents a conversation turn between the user and assistant.
 */
export interface ConversationTurn {
    /** The role of the speaker */
    role: 'user' | 'assistant' | 'system' | 'tool';
    /** The text content of the turn */
    content: string;
    /** The timestamp of the turn */
    timestamp: Date;
    /** Optional tool calls emitted by assistant */
    tool_calls?: any[];
    /** Optional tool call ID when role is 'tool' */
    tool_call_id?: string;
}

/**
 * Represents the result of an intent routing operation.
 */
export interface IntentMatch {
    /** The matched intent name */
    intent: string;
    /** Confidence score of the match (0.0 to 1.0) */
    confidence: number;
    /** The skill responsible for handling this intent */
    skill: string;
    /** Extracted parameters from the user utterance */
    parameters: Record<string, string>;
    /** The raw user utterance */
    raw: string;
}

/**
 * The context provided to a skill when it is invoked.
 */
export interface SkillContext {
    /** The intent match details */
    intent: IntentMatch;
    /** The ID of the user */
    userId: string;
    /** The ID of the current conversation */
    conversationId: string;
    /** The conversation history */
    history: ConversationTurn[];
}

/**
 * The result returned by a skill execution.
 */
export interface SkillResult {
    /** The natural language response from the skill */
    response: string;
    /** Optional action taken by the skill */
    action?: string;
    /** Optional data returned by the skill */
    data?: unknown;
    /** Whether the response should be spoken via TTS */
    speak?: boolean;
    /** Optional pipeline trace monitoring the execution graph */
    trace?: any;
}

/**
 * Supported LLM providers.
 */
export type LLMProvider = 'claude' | 'ollama';

export interface LLMMetrics {
    promptEvalDurationMs?: number;
    evalDurationMs?: number;
    totalDurationMs?: number;
    evalCount?: number;
    tokensPerSecond?: number;
}

/**
 * Request payload for LLM generation.
 */
export interface LLMRequest {
    /** The conversation history to send to the LLM */
    messages: ConversationTurn[];
    /** Optional system prompt to guide the LLM */
    systemPrompt?: string;
    /** Maximum number of tokens to generate */
    maxTokens?: number;
    /** Optional tool definitions for native tool calling */
    tools?: any[];
}

/**
 * Response payload from LLM generation.
 */
export interface LLMResponse {
    /** The generated content */
    content: string;
    /** The provider that generated the response */
    provider: LLMProvider;
    /** Optional token usage statistics */
    tokensUsed?: number;
    /** Optional tool calls emitted by the model */
    toolCalls?: Array<{
        id?: string;
        function: {
            name: string;
            arguments: Record<string, any>;
        };
    }>;
    /** Optional performance and timing telemetry metrics */
    metrics?: LLMMetrics;
}

/**
 * Represents an action to be executed within a routine.
 */
export interface RoutineAction {
    /** The skill to invoke */
    skill: string;
    /** The intent to trigger */
    intent: string;
    /** Parameters to pass to the skill */
    parameters: Record<string, string>;
}

/**
 * Configuration for an automated routine.
 */
export interface RoutineConfig {
    /** Unique identifier for the routine */
    id: string;
    /** Human-readable name */
    name: string;
    /** Cron expression for scheduling */
    cronExpression: string;
    /** List of actions to execute */
    actions: RoutineAction[];
    /** Whether the routine is currently enabled */
    enabled: boolean;
}
