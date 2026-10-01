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
import { SystemAutomationService } from './services/system-automation-service.js';
import { TelemetryService } from './services/telemetry-service.js';

// 1. Initialize SQLite Database Service for persistent storage
export const databaseService = new DatabaseService();

// 1.1 Initialize System Automation Service with audit logging
export const systemAutomationService = new SystemAutomationService(databaseService);

// 1.2 Initialize Telemetry Service for hardware and model network monitoring
export const telemetryService = new TelemetryService();

// 2. Initialize skill registry and register built-in skills (automation inactive in model by default)
export const skillRegistry = new SkillRegistry();
registerAllSkills(skillRegistry, databaseService);

// 3. Initialize intent router
export const intentRouter = new IntentRouter(skillRegistry);

// 4. Initialize conversation manager backed by SQLite
export const conversationManager = new ConversationManager(10, databaseService);

// 5. Initialize web service for internet search and data extraction
export const webService = new WebService();

// 6. Initialize LLM providers and service grounded with SQLite memories
export const claudeProvider = new ClaudeProvider();
export const ollamaProvider = new OllamaProvider();
export const llmService = new LLMService(
  {
    claude: claudeProvider,
    ollama: ollamaProvider,
  },
  databaseService
);

// 7. Initialize orchestrator (central brain connecting router, skills, LLM, memory, and web grounding)
export const orchestrator = new Orchestrator(
  intentRouter,
  skillRegistry,
  llmService,
  conversationManager,
  webService,
  telemetryService,
  databaseService
);

// 8. Initialize scheduler service for automated routines backed by SQLite
export const schedulerService = new SchedulerService(skillRegistry, databaseService);
