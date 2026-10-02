import { SkillRegistry } from './core/skill-registry.js';
import { registerAllSkills } from './skills/index.js';
import { IntentRouter } from './core/intent-router.js';
import { ConversationManager } from './core/conversation-manager.js';
import { ClaudeProvider } from './services/llm/claude-provider.js';
import { OllamaProvider } from './services/llm/ollama-provider.js';
import { LLMService } from './services/llm/llm-service.js';
import { Orchestrator } from './core/orchestrator.js';
import { SchedulerService } from './services/scheduler.js';
import { WebService } from './services/web-service.js';
import { DatabaseService } from './services/database.js';
import { RAGService } from './services/rag-service.js';
import { SystemAutomationService } from './services/system-automation-service.js';
import { TelemetryService } from './services/telemetry-service.js';
import { SandboxService } from './services/sandbox-service.js';
import { BriefingService } from './services/briefing-service.js';
import { MusicService } from './services/music-service.js';

// 1. Initialize SQLite Database Service for persistent storage
export const databaseService = new DatabaseService();

// 1.1 Initialize System Automation Service with audit logging
export const systemAutomationService = new SystemAutomationService(databaseService);

// 1.2 Initialize Telemetry Service for hardware and model network monitoring
export const telemetryService = new TelemetryService();

// 1.3 Initialize Web Service for internet search and data extraction
export const webService = new WebService();

// 1.4 Initialize RAG Service for document ingestion and semantic vector retrieval
export const ragService = new RAGService(databaseService);

// 1.5 Initialize Safe Math & Code Execution Sandbox Service
export const sandboxService = new SandboxService();

// 1.6 Initialize Proactive Voice Briefing Service
export const briefingService = new BriefingService(
  databaseService,
  webService,
  telemetryService
);

// 1.7 Initialize Inbuilt Music Service for YouTube and Spotify
export const musicService = new MusicService();

// 2. Initialize skill registry and register built-in skills
export const skillRegistry = new SkillRegistry();
registerAllSkills(
  skillRegistry,
  databaseService,
  systemAutomationService,
  { enableAutomation: false },
  briefingService,
  musicService
);

// 3. Initialize intent router grounded with persistent database
export const intentRouter = new IntentRouter(skillRegistry, databaseService);

// 4. Initialize conversation manager backed by SQLite
export const conversationManager = new ConversationManager(10, databaseService);

// 5. Initialize LLM providers and service grounded with SQLite memories
export const claudeProvider = new ClaudeProvider();
export const ollamaProvider = new OllamaProvider();
export const llmService = new LLMService(
  {
    claude: claudeProvider,
    ollama: ollamaProvider,
  },
  databaseService
);

// Connect LLM service to memory skill for intelligent fallback interpretation
const memSkill = skillRegistry.get('memory') as any;
if (memSkill && typeof memSkill.setLLMService === 'function') {
  memSkill.setLLMService(llmService);
}

// 6. Initialize orchestrator (central brain connecting router, skills, LLM, memory, web, sandbox, and briefing)
export const orchestrator = new Orchestrator(
  intentRouter,
  skillRegistry,
  llmService,
  conversationManager,
  webService,
  telemetryService,
  databaseService,
  ragService,
  sandboxService,
  briefingService
);

// 7. Initialize scheduler service for automated routines backed by SQLite
export const schedulerService = new SchedulerService(skillRegistry, databaseService);

// Seed default intelligent routines if none exist in SQLite
const existingRoutines = schedulerService.getRoutines();
if (existingRoutines.length === 0) {
  schedulerService.addRoutine({
    id: 'routine-morning-briefing',
    name: 'Morning Intelligence Briefing',
    cronExpression: '0 8 * * *',
    actions: [
      {
        skill: 'briefing',
        intent: 'morning_briefing',
        parameters: {},
      },
    ],
    enabled: true,
  });

  schedulerService.addRoutine({
    id: 'routine-evening-briefing',
    name: 'Evening Daily Summary',
    cronExpression: '0 20 * * *',
    actions: [
      {
        skill: 'briefing',
        intent: 'evening_briefing',
        parameters: {},
      },
    ],
    enabled: true,
  });
}
