import { createApp } from '../src/app.js';
import {
  skillRegistry,
  intentRouter,
  orchestrator,
  schedulerService,
  conversationManager,
} from '../src/container.js';
import { isPrivateIp, WebService } from '../src/services/web-service.js';
import type { Server } from 'http';

async function runTests() {
  console.log('🧪 Starting Zyra Assistant verification tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Test Skill Registry
  console.log('[1] Testing Skill Registry...');
  const skills = skillRegistry.list();
  assert(skills.length >= 10, 'Skills registered', `Found ${skills.length} skills`);
  assert(skillRegistry.has('greeting'), 'Greeting skill exists');
  assert(skillRegistry.has('time'), 'Time skill exists');
  assert(skillRegistry.has('alarm'), 'Alarm skill exists');
  assert(skillRegistry.has('music'), 'Music skill exists');
  assert(skillRegistry.has('control'), 'Control skill exists');
  assert(skillRegistry.has('system-info'), 'System info skill exists');
  assert(skillRegistry.has('weather'), 'Weather skill exists');
  assert(skillRegistry.has('memory'), 'Memory skill exists');
  assert(skillRegistry.has('timer'), 'Timer skill exists');
  assert(skillRegistry.has('todo'), 'Todo skill exists');
  assert(!skillRegistry.has('system_automation'), 'System automation skill is removed from model by default');

  // 2. Test Intent Router
  console.log('\n[2] Testing Intent Router...');
  const testCases = [
    { input: 'what time is it', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what time is it in Tokyo', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'time in Paris', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what is the weather in London', expectedSkill: 'weather', expectedIntent: 'check_weather' },
    { input: 'remember that my favorite color is emerald green', expectedSkill: 'memory', expectedIntent: 'remember_fact' },
    { input: 'what do you remember about me', expectedSkill: 'memory', expectedIntent: 'recall_all' },
    { input: 'current time', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what is today date', expectedSkill: 'time', expectedIntent: 'get_date' },
    { input: 'play Bohemian Rhapsody', expectedSkill: 'music', expectedIntent: 'play_music' },
    { input: 'set alarm 7:00 AM', expectedSkill: 'alarm', expectedIntent: 'set_alarm' },
    { input: 'hello zyra', expectedSkill: 'greeting', expectedIntent: 'greet' },
    { input: 'stop', expectedSkill: 'control', expectedIntent: 'stop' },
    { input: 'how are you', expectedSkill: 'system-info', expectedIntent: 'how_are_you' },
    { input: 'write me a poem about quantum gravity', expectedSkill: null, expectedIntent: null },
  ];

  for (const tc of testCases) {
    const match = intentRouter.route(tc.input);
    if (tc.expectedSkill === null) {
      assert(match === null, `Fallback for non-command: "${tc.input}"`);
    } else {
      assert(
        match !== null && match.skill === tc.expectedSkill,
        `Routing "${tc.input}" -> skill "${tc.expectedSkill}"`,
        `Got: ${match?.skill}`
      );
    }
  }

  // 3. Test Orchestrator with Matched Skills
  console.log('\n[3] Testing Orchestrator (Skill Execution)...');
  const convId = 'test-session-1';
  const timeResult = await orchestrator.process('what time is it', convId);
  assert(timeResult.provider === 'skill', 'Orchestrator routed time to skill');
  assert(timeResult.response.includes("It's"), 'Time skill returned valid response', timeResult.response);

  const greetingResult = await orchestrator.process('hello zyra', convId);
  assert(greetingResult.provider === 'skill', 'Orchestrator routed greeting to skill');
  assert(greetingResult.response.includes('Eren'), 'Greeting skill personalized for owner', greetingResult.response);

  const musicResult = await orchestrator.process('play jazz', convId);
  assert(musicResult.response.includes('jazz'), 'Music skill extracted query parameter', musicResult.response);

  // Test World Time Skill
  const worldTimeResult = await orchestrator.process('what time is it in Tokyo', convId);
  assert(worldTimeResult.provider === 'skill', 'World time routed to skill');
  assert(worldTimeResult.response.includes('Tokyo'), 'World time resolved Tokyo correctly', worldTimeResult.response);

  // Test Weather Skill
  const weatherResult = await orchestrator.process('what is the weather in London', convId);
  assert(weatherResult.provider === 'skill', 'Weather routed to skill');
  assert(weatherResult.response.includes('London') && weatherResult.response.includes('°C'), 'Weather returned live temperature for London', weatherResult.response);

  // Test Memory Skill Execution
  const memoryResult = await orchestrator.process('remember that my favorite color is emerald green', convId);
  assert(memoryResult.provider === 'skill', 'Memory routed to skill');
  assert(memoryResult.response.includes('emerald green') || memoryResult.response.includes('memory') || memoryResult.response.includes('Eren'), 'Memory confirmed saving fact', memoryResult.response);

  // Test Timer Skill Execution
  const timerResult = await orchestrator.process('set a timer for 10 minutes', convId);
  assert(timerResult.provider === 'skill', 'Timer routed to skill');
  assert(timerResult.response.includes('10 minutes'), 'Timer confirmed setting 10 minutes', timerResult.response);

  const checkTimerResult = await orchestrator.process('how much time is left on my timer', convId);
  assert(checkTimerResult.provider === 'skill', 'Check timer routed to skill');
  assert(checkTimerResult.response.includes('remaining'), 'Check timer reports remaining time', checkTimerResult.response);

  const cancelTimerResult = await orchestrator.process('cancel my timer', convId);
  assert(cancelTimerResult.provider === 'skill', 'Cancel timer routed to skill');
  assert(cancelTimerResult.response.includes('cancelled'), 'Cancel timer confirmed cancellation', cancelTimerResult.response);

  // Test Todo / Task Skill Execution
  const addTaskResult = await orchestrator.process('add review pull request to my tasks', convId);
  assert(addTaskResult.provider === 'skill', 'Add task routed to skill');
  assert(addTaskResult.response.includes('review pull request'), 'Add task confirmed task addition', addTaskResult.response);

  const listTasksResult = await orchestrator.process('what are my tasks', convId);
  assert(listTasksResult.provider === 'skill', 'List tasks routed to skill');
  assert(listTasksResult.response.includes('review pull request'), 'List tasks shows added task', listTasksResult.response);

  // Verify that desktop application automation is strictly blocked in orchestrator
  const modelAutomationCheck = await orchestrator.process('open calculator', convId);
  assert(modelAutomationCheck.intent?.skill !== 'system_automation', 'System automation skill is inactive in the active model');
  assert(modelAutomationCheck.response.includes('disabled'), 'Model explicitly refuses to open applications', modelAutomationCheck.response);

  // Test Standalone System Automation (Preserved as an idea for future integration)
  const { SystemAutomationSkill } = await import('../src/skills/system-automation-skill.js');
  const { systemAutomationService } = await import('../src/container.js');
  const standaloneAutomationSkill = new SystemAutomationSkill(systemAutomationService);

  // Test Prohibited Command Defense via Standalone Skill
  const prohibitedResult = await standaloneAutomationSkill.execute({
    intent: { intent: 'prohibited_action', skill: 'system_automation', confidence: 1, raw: 'shutdown computer' },
    conversationId: convId,
  });
  assert(prohibitedResult.response.includes('prohibited'), 'Standalone skill blocks prohibited actions', prohibitedResult.response);

  // Test Staging via Standalone Skill
  const stageSkillResult = await standaloneAutomationSkill.execute({
    intent: { intent: 'launch_app', skill: 'system_automation', confidence: 1, parameters: { target: 'calculator' }, raw: 'open calculator' },
    conversationId: convId,
  });
  assert(stageSkillResult.action === 'pending_confirmation', 'Standalone skill stages allowlisted app with confirmation');
  assert(stageSkillResult.response.includes('confirm to proceed'), 'Standalone skill requests user confirmation', stageSkillResult.response);

  // Test Confirmation via Standalone Skill (Verifying execution is strictly disabled)
  const confirmSkillResult = await standaloneAutomationSkill.execute({
    intent: { intent: 'confirm_action', skill: 'system_automation', confidence: 1, raw: 'confirm' },
    conversationId: convId,
  });
  assert(confirmSkillResult.action === 'automation_error', 'Standalone skill blocks app execution when disabled');
  assert(confirmSkillResult.response.includes('disabled'), 'Standalone skill acknowledges automation is disabled', confirmSkillResult.response);

  // Test System Automation Allowlist & Safe Availability Checks
  const { ALLOWED_APPS } = await import('../src/services/system-automation-service.js');
  
  const testApps = ['calculator', 'notepad', 'vscode', 'spotify', 'paint', 'terminal'];
  for (const appKey of testApps) {
    const resolved = systemAutomationService.resolveApp(appKey);
    assert(resolved !== null && resolved.key === appKey, `App resolution for "${appKey}" resolves to ${appKey}`);
    if (resolved) {
      const target = systemAutomationService.resolveLaunchTarget(resolved);
      assert(target !== null && typeof target === 'string', `Safe check: resolved target for ${resolved.name}`, `Target: ${target}`);
    }
  }

  // Test Security Block on Unapproved Application
  const unapprovedStage = systemAutomationService.stageLaunchApp('malware.exe');
  assert(!unapprovedStage.success, 'Stage rejects unapproved application');
  assert(unapprovedStage.message.includes('pre-approved desktop applications'), 'Rejection message explains security allowlist');

  // Test Security Block on Prohibited Command
  const prohibitedStage = systemAutomationService.stageLaunchApp('format c:');
  assert(prohibitedStage.prohibited === true && !prohibitedStage.success, 'Stage blocks destructive command: format c:');
  assert(prohibitedStage.message.includes('strictly prohibited'), 'Rejection message explains prohibited destructive command');

  // Test Cancellation of Staged Action
  const stageNotepad = systemAutomationService.stageLaunchApp('notepad');
  assert(stageNotepad.success === true, 'Successfully staged notepad for cancellation test');
  const cancelResult = systemAutomationService.cancelAction(stageNotepad.pendingAction?.id);
  assert(cancelResult.success === true, 'Successfully cancelled staged notepad launch');
  assert(systemAutomationService.getPendingAction() === null, 'Pending action is null after cancellation');

  // 4. Test Conversation History & SQLite Persistence
  console.log('\n[4] Testing Conversation Manager & SQLite Persistence...');
  const history = conversationManager.getHistory(convId);
  assert(history.length >= 10, 'History recorded conversation turns', `Length: ${history.length}`);
  assert(history[0].role === 'user', 'First turn was user');
  assert(history[1].role === 'assistant', 'Second turn was assistant');

  // Test SQLite persistence across fresh instance
  const { DatabaseService } = await import('../src/services/database.js');
  const { ConversationManager } = await import('../src/core/conversation-manager.js');
  const freshDb = new DatabaseService();
  const freshConvMgr = new ConversationManager(10, freshDb);
  const reloadedHistory = freshConvMgr.getHistory(convId);
  assert(reloadedHistory.length >= 10, 'Reloaded history persisted across instances via SQLite', `Length: ${reloadedHistory.length}`);

  // 5. Test Scheduler Service
  console.log('\n[5] Testing Scheduler Service...');
  const testRoutine = {
    id: 'morning-routine',
    name: 'Morning Routine',
    cronExpression: '0 7 * * *',
    actions: [
      { skill: 'music', intent: 'play_music', parameters: { query: 'Morning Playlist' } },
      { skill: 'greeting', intent: 'greet', parameters: {} },
    ],
    enabled: true,
  };

  schedulerService.addRoutine(testRoutine);
  const routines = schedulerService.getRoutines();
  assert(routines.some((r) => r.id === 'morning-routine'), 'Routine added to scheduler');

  const triggerResults = await schedulerService.triggerRoutine('morning-routine');
  assert(triggerResults.length === 2, 'Routine actions executed sequentially', `Executed: ${triggerResults.length}`);
  assert(triggerResults[0].response.includes('Morning Playlist'), 'First action played music');
  assert(triggerResults[1].response.includes('Eren'), 'Second action greeted owner');

  schedulerService.removeRoutine('morning-routine');
  assert(!schedulerService.getRoutines().some((r) => r.id === 'morning-routine'), 'Routine removed successfully');

  // 6. Test Express HTTP API
  console.log('\n[6] Testing HTTP API Endpoints...');
  const app = createApp();
  const testPort = 3099;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  try {
    // GET /api/v1/health
    const healthRes = await fetch(`http://localhost:${testPort}/api/v1/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/v1/health returns 200');
    assert(healthJson.status === 'ok', 'Health status is ok');
    assert(healthJson.assistant === 'Zyra', 'Assistant name in health payload');

    // GET /api/v1/skills
    const skillsRes = await fetch(`http://localhost:${testPort}/api/v1/skills`);
    const skillsJson = (await skillsRes.json()) as any[];
    assert(skillsRes.status === 200, 'GET /api/v1/skills returns 200');
    assert(skillsJson.length >= 6, 'Skills endpoint returns registered skills', `Got ${skillsJson.length}`);

    // POST /api/v1/chat (Command)
    const chatRes = await fetch(`http://localhost:${testPort}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'what time is it' }),
    });
    const chatJson = await chatRes.json();
    assert(chatRes.status === 200, 'POST /api/v1/chat returns 200');
    assert(chatJson.provider === 'skill', 'Chat endpoint routed to skill', `Provider: ${chatJson.provider}`);
    assert(chatJson.response.length > 0, 'Chat endpoint returned response', chatJson.response);
    assert(chatJson.trace !== undefined, 'Chat response includes pipeline trace monitoring graph');
    assert(Array.isArray(chatJson.trace?.nodes), 'Pipeline trace includes execution nodes array');

    // GET /api/v1/telemetry/nodes
    const telemetryRes = await fetch(`http://localhost:${testPort}/api/v1/telemetry/nodes`);
    const telemetryJson = await telemetryRes.json();
    assert(telemetryRes.status === 200, 'GET /api/v1/telemetry/nodes returns 200');
    assert(telemetryJson.hardware !== undefined, 'Telemetry payload contains hardware metrics');
    assert(typeof telemetryJson.hardware.systemMemoryTotalMB === 'number', 'Hardware metrics contain system memory');
    assert(telemetryJson.model !== undefined, 'Telemetry payload contains model node metrics');
    assert(Array.isArray(telemetryJson.recentTraces), 'Telemetry payload contains recent execution traces');

    // POST & GET /api/v1/routines
    const routineRes = await fetch(`http://localhost:${testPort}/api/v1/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Test Routine',
        cronExpression: '0 8 * * *',
        actions: [{ skill: 'time', intent: 'get_time', parameters: {} }],
        enabled: true,
      }),
    });
    const routineJson = await routineRes.json();
    assert(routineRes.status === 201, 'POST /api/v1/routines returns 201');
    assert(routineJson.name === 'API Test Routine', 'Routine created with correct name');

    const triggerRes = await fetch(`http://localhost:${testPort}/api/v1/routines/${routineJson.id}/trigger`, {
      method: 'POST',
    });
    const triggerJson = await triggerRes.json();
    assert(triggerRes.status === 200, 'POST /api/v1/routines/:id/trigger returns 200');
    assert(triggerJson.results.length === 1, 'Manual trigger returned action results');

    // Clean up routine
    await fetch(`http://localhost:${testPort}/api/v1/routines/${routineJson.id}`, { method: 'DELETE' });

    // Test Memory HTTP endpoint
    const memoryRes = await fetch(`http://localhost:${testPort}/api/v1/memory`);
    const memoryJson = await memoryRes.json();
    assert(memoryRes.status === 200, 'GET /api/v1/memory returns 200');
    assert(typeof memoryJson.memories === 'object', 'Memory endpoint returns memories object');

    // Test Automation Audit HTTP endpoint
    const auditRes = await fetch(`http://localhost:${testPort}/api/v1/automation/audit`);
    const auditJson = await auditRes.json();
    assert(auditRes.status === 200, 'GET /api/v1/automation/audit returns 200');
    assert(Array.isArray(auditJson.logs), 'Automation audit endpoint returns logs array');

    // 7. Test Security & Defensive Hardening
    console.log('\n[7] Testing Security & Defensive Hardening...');
    // SSRF checks
    assert(isPrivateIp('127.0.0.1'), 'SSRF guard flags 127.0.0.1 as private');
    assert(isPrivateIp('10.0.1.5'), 'SSRF guard flags 10.x.x.x as private');
    assert(isPrivateIp('192.168.1.1'), 'SSRF guard flags 192.168.x.x as private');
    assert(isPrivateIp('169.254.169.254'), 'SSRF guard flags cloud metadata IP as private');
    assert(!isPrivateIp('8.8.8.8'), 'SSRF guard permits public IP');

    const testWebService = new WebService();
    let ssrfBlocked = false;
    try {
      await testWebService.extractUrl('http://127.0.0.1:11434');
    } catch {
      ssrfBlocked = true;
    }
    assert(ssrfBlocked, 'WebService blocks direct SSRF against loopback IP (127.0.0.1)');

    let localhostBlocked = false;
    try {
      await testWebService.extractUrl('http://localhost:3000');
    } catch {
      localhostBlocked = true;
    }
    assert(localhostBlocked, 'WebService blocks direct SSRF against localhost');

    // Invalid cron validation
    const badCronRes = await fetch(`http://localhost:${testPort}/api/v1/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Routine',
        cronExpression: 'not a valid cron',
        actions: [{ skill: 'time', intent: 'get_time', parameters: {} }],
      }),
    });
    assert(badCronRes.status === 400, 'POST /api/v1/routines rejects invalid cron with 400 Bad Request');

    // Chat max length bounds
    const hugeMsgRes = await fetch(`http://localhost:${testPort}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'x'.repeat(4500) }),
    });
    assert(hugeMsgRes.status === 400, 'POST /api/v1/chat rejects message exceeding max limit with 400 Bad Request');

    // Voice max length bounds
    const hugeTtsRes = await fetch(
      `http://localhost:${testPort}/api/v1/voice/tts?text=${encodeURIComponent('x'.repeat(1200))}`
    );
    assert(hugeTtsRes.status === 400, 'GET /api/v1/voice/tts rejects text exceeding max limit with 400 Bad Request');

  } finally {
    server.close();
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
