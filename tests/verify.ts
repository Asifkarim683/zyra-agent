import { createApp } from '../src/app.js';
import {
  skillRegistry,
  intentRouter,
  orchestrator,
  schedulerService,
  conversationManager,
} from '../src/container.js';
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
  assert(skills.length >= 7, 'Skills registered', `Found ${skills.length} skills`);
  assert(skillRegistry.has('greeting'), 'Greeting skill exists');
  assert(skillRegistry.has('time'), 'Time skill exists');
  assert(skillRegistry.has('alarm'), 'Alarm skill exists');
  assert(skillRegistry.has('music'), 'Music skill exists');
  assert(skillRegistry.has('control'), 'Control skill exists');
  assert(skillRegistry.has('system-info'), 'System info skill exists');
  assert(skillRegistry.has('weather'), 'Weather skill exists');

  // 2. Test Intent Router
  console.log('\n[2] Testing Intent Router...');
  const testCases = [
    { input: 'what time is it', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what time is it in Tokyo', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'time in Paris', expectedSkill: 'time', expectedIntent: 'get_time' },
    { input: 'what is the weather in London', expectedSkill: 'weather', expectedIntent: 'check_weather' },
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

  // 4. Test Conversation History
  console.log('\n[4] Testing Conversation Manager...');
  const history = conversationManager.getHistory(convId);
  assert(history.length === 10, 'History recorded 5 user and 5 assistant turns', `Length: ${history.length}`);
  assert(history[0].role === 'user', 'First turn was user');
  assert(history[1].role === 'assistant', 'Second turn was assistant');

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
