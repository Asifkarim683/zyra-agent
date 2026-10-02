export interface PipelineNode {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
  durationMs: number;
  startTime: number;
  endTime?: number;
  input?: any;
  output?: any;
  details?: Record<string, any>;
}

export interface PipelineTrace {
  traceId: string;
  timestamp: string;
  prompt: string;
  totalDurationMs: number;
  nodes: PipelineNode[];
  hardware?: {
    gpuName: string;
    gpuVramUsedMB: number;
    gpuVramTotalMB: number;
    gpuVramPercent: number;
    systemMemoryPercent: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  intent?: {
    intent: string;
    skill: string;
    confidence: number;
    parameters?: Record<string, string>;
  };
  action?: string;
  data?: any;
  trace?: PipelineTrace;
  isStreaming?: boolean;
  statusText?: string;
}

export interface SystemHealth {
  status: string;
  assistant: string;
  owner: string;
  uptime: number;
  version: string;
  llmMode: string;
  activeSkills: number;
  timestamp: string;
}

export interface SkillItem {
  name: string;
  description: string;
  patternCount: number;
}

export interface RoutineAction {
  skill: string;
  intent: string;
  parameters: Record<string, string>;
}

export interface RoutineItem {
  id: string;
  name: string;
  cronExpression: string;
  actions: RoutineAction[];
  enabled: boolean;
}

export interface WebSource {
  title: string;
  snippet: string;
  url: string;
  domain?: string;
}

export interface KnowledgeChunk {
  id: string;
  title: string;
  source: string;
  content: string;
  score?: number;
}

export interface DocumentItem {
  source: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

export interface CalculationData {
  code: string;
  result?: any;
  formattedResult?: string;
  logs: string[];
  executionTimeMs: number;
  error?: string;
}

export interface BriefingData {
  id: string;
  type: 'morning' | 'evening' | 'general';
  displayText: string;
  voiceText: string;
  createdAt: string;
  metadata?: {
    weather?: string;
    tasksCount: number;
    gpuTemp?: number;
    newsCount: number;
  };
}

