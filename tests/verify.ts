import { createApp } from '../src/app.js';
import {
  skillRegistry,
  intentRouter,
  orchestrator,
  schedulerService,
  conversationManager,
  sandboxService,
  briefingService,
} from '../src/container.js';
import { isPrivateIp, WebService } from '../src/services/web-service.js';
import { getToolsForPrompt } from '../src/core/tools.js';
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
  assert(skillRegistry.has('briefing'), 'Briefing skill exists');
  assert(!skillRegistry.has('system_automation'), 'System automation skill is removed from model by default');

  // 2. Test Intent Router
  console.log('\n[2] Testing Intent Router...');
  const testCases = [
    { input: 'what time is it', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what time is it in Tokyo', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'time in Paris', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what is the weather in London', expectedSkill: 'weather', expectedIntent: 'check_weather' },
    { input: 'remember that my favorite color is emerald green', expectedSkill: 'memory', expectedIntent: 'remember_fact' },
    { input: 'remember Im from Odisha Bhubaneshwar India', expectedSkill: 'memory', expectedIntent: 'remember_fact' },
    { input: 'where am I from', expectedSkill: 'memory', expectedIntent: 'recall_specific' },
    { input: 'what is my job', expectedSkill: 'memory', expectedIntent: 'recall_specific' },
    { input: 'what do you remember about me', expectedSkill: 'memory', expectedIntent: 'recall_all' },
    { input: 'current time', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what is today date', expectedSkill: 'time', expectedIntent: 'get_date' },
    { input: 'play Bohemian Rhapsody', expectedSkill: 'music', expectedIntent: 'play_music' },
    { input: 'set alarm 7:00 AM', expectedSkill: 'alarm', expectedIntent: 'set_alarm' },
    { input: 'hello zyra', expectedSkill: 'greeting', expectedIntent: 'greet' },
    { input: 'stop', expectedSkill: 'control', expectedIntent: 'stop' },
    { input: 'how are you', expectedSkill: 'system-info', expectedIntent: 'how_are_you' },
    { input: 'brief me', expectedSkill: 'briefing', expectedIntent: 'daily_briefing' },
    { input: 'morning briefing', expectedSkill: 'briefing', expectedIntent: 'morning_briefing' },
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

  // Test Intelligent Fact Interpretation (User Test Case: "remember Im from Odisha Bhubaneshwar India")
  const locationResult = await orchestrator.process('remember Im from Odisha Bhubaneshwar India', convId);
  assert(locationResult.provider === 'skill', 'Location statement routed to memory skill');
  assert(!locationResult.response.includes('your im from odisha bhuba is'), 'Memory does not generate sliced/broken grammar');
  assert(locationResult.response.includes('Bhubaneshwar') && locationResult.response.includes('Odisha') && locationResult.response.includes('India'), 'Memory accurately parsed Bhubaneshwar, Odisha, India', locationResult.response);

  // Test Recall Location
  const whereAmIResult = await orchestrator.process('where am I from', convId);
  assert(whereAmIResult.provider === 'skill', 'Where am I from routed to memory');
  assert(whereAmIResult.response.includes('Bhubaneshwar'), 'Recalls saved location correctly', whereAmIResult.response);

  // Test Profession Fact Interpretation
  const professionResult = await orchestrator.process('remember that I am a software engineer', convId);
  assert(professionResult.response.includes('Software Engineer'), 'Memory confirmed saving profession', professionResult.response);

  // Test Recall Profession
  const whatIsMyJobResult = await orchestrator.process('what is my job', convId);
  assert(whatIsMyJobResult.response.includes('Software Engineer'), 'Recalls saved profession correctly', whatIsMyJobResult.response);

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

    // POST /api/v1/chat/stream (SSE Real-Time Token Streaming)
    const streamRes = await fetch(`http://localhost:${testPort}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'what time is it' }),
    });
    assert(streamRes.status === 200, 'POST /api/v1/chat/stream returns 200');
    assert(streamRes.headers.get('content-type')?.includes('text/event-stream') === true, 'Stream endpoint returns text/event-stream');
    const streamBody = await streamRes.text();
    assert(streamBody.includes('event: start'), 'Stream payload includes start event');
    assert(streamBody.includes('event: token'), 'Stream payload includes token events');
    assert(streamBody.includes('event: done'), 'Stream payload includes done event');
    assert(streamBody.includes('traceId'), 'Stream done event contains trace metadata');

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

    // 8. Test HTTP Sandbox Endpoint
    console.log('\n[8] Testing HTTP Sandbox & Math Execution Endpoints...');
    const sandboxMathRes = await fetch(`http://localhost:${testPort}/api/v1/sandbox/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'sum(10, 20, 30) + 5' }),
    });
    const sandboxMathJson = await sandboxMathRes.json();
    assert(sandboxMathRes.status === 200, 'POST /api/v1/sandbox/execute returns 200');
    assert(sandboxMathJson.success === true, 'Sandbox math execution succeeded');
    assert(sandboxMathJson.result === 65, 'Sandbox computed sum(10, 20, 30) + 5 = 65');

    const sandboxBlockRes = await fetch(`http://localhost:${testPort}/api/v1/sandbox/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'process.exit(1)' }),
    });
    const sandboxBlockJson = await sandboxBlockRes.json();
    assert(sandboxBlockJson.success === false, 'Sandbox blocked forbidden process token over HTTP');
    assert(sandboxBlockJson.error?.includes('prohibited'), 'Sandbox explains security policy');

    // 9. Test HTTP Briefing Endpoints
    console.log('\n[9] Testing HTTP Voice Briefing Endpoints...');
    const genBriefingRes = await fetch(`http://localhost:${testPort}/api/v1/briefings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'morning' }),
    });
    const genBriefingJson = await genBriefingRes.json();
    assert(genBriefingRes.status === 200, 'POST /api/v1/briefings/generate returns 200');
    assert(genBriefingJson.type === 'morning', 'Briefing returned morning type');
    assert(genBriefingJson.displayText.includes('Morning Briefing'), 'Briefing displayText contains header');
    assert(genBriefingJson.voiceText.length > 30, 'Briefing voiceText contains natural conversational spoken sentences');
    assert(!genBriefingJson.voiceText.includes('###') && !genBriefingJson.voiceText.includes('http'), 'Briefing voiceText contains no markdown headers or raw URLs');

    const pendingBriefingRes = await fetch(`http://localhost:${testPort}/api/v1/briefings/pending`);
    const pendingBriefingJson = await pendingBriefingRes.json();
    assert(pendingBriefingRes.status === 200, 'GET /api/v1/briefings/pending returns 200');
    assert(Array.isArray(pendingBriefingJson.pending), 'Pending briefings returned as array');
    assert(pendingBriefingJson.pending.length >= 1, 'Pending briefings contains newly generated notification');

    const ackBriefingRes = await fetch(`http://localhost:${testPort}/api/v1/briefings/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: genBriefingJson.id }),
    });
    const ackBriefingJson = await ackBriefingRes.json();
    assert(ackBriefingRes.status === 200, 'POST /api/v1/briefings/ack returns 200');
    assert(ackBriefingJson.success === true, 'Briefing notification acknowledged');

    // 10. Test Standalone Math, Statistics & Conversion Helpers
    console.log('\n[10] Testing Standalone Sandbox Engine & Mathematical Library...');
    const basicMath = sandboxService.execute('2 + 3 * 4');
    assert(basicMath.success && basicMath.result === 14, 'Basic arithmetic: 2 + 3 * 4 = 14');

    const stats = sandboxService.execute('avg(10, 20, 30) + median(1, 3, 5, 7, 9)');
    assert(stats.success && stats.result === 25, 'Statistics: avg(10, 20, 30) + median(1, 3, 5, 7, 9) = 25');

    const compound = sandboxService.execute('compoundInterest(1000, 0.10, 1, 2)');
    assert(compound.success && compound.result.finalAmount === 1210, 'Compound interest: $1,000 at 10% for 2 years = $1,210');

    const dates = sandboxService.execute("daysBetween('2026-01-01', '2026-01-11')");
    assert(dates.success && dates.result === 10, 'Date arithmetic: daysBetween returns 10 days');

    const units = sandboxService.execute("unitConvert(100, 'km', 'miles')");
    assert(units.success && Math.abs(units.result - 62.1371) < 0.01, 'Unit conversion: 100 km converts to ~62.14 miles');

    const loopDefense = sandboxService.execute('while(true){}');
    assert(!loopDefense.success && loopDefense.error?.includes('timed out'), 'Infinite loop execution timed out safely');

    // 11. Test Dynamic Tool Injection for Math & Briefing
    console.log('\n[11] Testing Dynamic Tool Gating for Math & Briefing...');
    const mathTools = getToolsForPrompt('please calculate the compound interest on 5000 dollars at 6%');
    assert(mathTools.some((t) => t.function.name === 'execute_calculation_or_code'), 'Math prompt routes to execute_calculation_or_code tool');

    const briefingTools = getToolsForPrompt('give me my morning voice briefing');
    assert(briefingTools.some((t) => t.function.name === 'get_voice_briefing'), 'Briefing prompt routes to get_voice_briefing tool');

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
