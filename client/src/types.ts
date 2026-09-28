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
