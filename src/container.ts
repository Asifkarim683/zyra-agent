import { SkillRegistry } from './core/skill-registry.js';
import { registerAllSkills } from './skills/index.js';
import { IntentRouter } from './core/intent-router.js';
import { ConversationManager } from './core/conversation-manager.js';
import { ClaudeProvider } from './services/llm/claude-provider.js';
import { OllamaProvider } from './services/llm/ollama-provider.js';
import { LLMService } from './services/llm/llm-service.js';
import { Orchestrator } from './core/orchestrator.js';
import { SchedulerService } from './services/scheduler.js';

// 1. Initialize skill registry and register built-in skills
export const skillRegistry = new SkillRegistry();
registerAllSkills(skillRegistry);

// 2. Initialize intent router
export const intentRouter = new IntentRouter(skillRegistry);

// 3. Initialize conversation manager for short-term memory
export const conversationManager = new ConversationManager();

// 4. Initialize LLM providers and service
export const claudeProvider = new ClaudeProvider();
export const ollamaProvider = new OllamaProvider();
export const llmService = new LLMService({
  claude: claudeProvider,
  ollama: ollamaProvider,
});

// 5. Initialize orchestrator (central brain connecting router, skills, LLM, memory)
export const orchestrator = new Orchestrator(
  intentRouter,
  skillRegistry,
  llmService,
  conversationManager
);

// 6. Initialize scheduler service for automated routines
export const schedulerService = new SchedulerService(skillRegistry);
