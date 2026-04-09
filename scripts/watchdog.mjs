/**
 * Paperclip Watchdog — Auto Error Recovery
 * 
 * Runs every 90 seconds. Catches:
 *  1. Agents stuck in "error" status → resume them
 *  2. Agents with heartbeat disabled → re-enable it
 *  3. Agents with no tasks → create a fallback task
 *  4. Failed heartbeat runs with adapter_failed (wrong CLI) → patch to ollama_local
 *  5. Agents idle >10min with tasks → force-wake
 */

const BASE = 'http://localhost:3105/api';
const COMPANY = '16ce14fb-40a6-4439-9bd8-4c5d2659ded6';
const PROJECT  = 'afbe53ea-e26a-45a7-b372-c4464f3bf0fe';
const GOAL     = 'e73cac8e-aab8-40d7-b4c7-721863db193b';

const OLLAMA_HEARTBEAT = {
  heartbeat: { enabled: true, intervalSec: 120, cooldownSec: 10, wakeOnDemand: true, maxConcurrentRuns: 1 }
};

async function api(method, path, body) {
  try {
    const r = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
  } catch (e) {
    return { ok: false, status: 0, data: {}, error: e.message };
  }
}

function ts() { return new Date().toISOString().substring(11, 19); }
function log(msg) { console.log(`[${ts()}] ${msg}`); }

async function checkAndHeal() {
  log('--- Watchdog cycle starting ---');

  // 1. Get all agents
  const agentsRes = await api('GET', `/companies/${COMPANY}/agents`);
  if (!agentsRes.ok) { log(`❌ Cannot fetch agents: ${agentsRes.status}`); return; }
  const agents = agentsRes.data;
  log(`📋 ${agents.length} agents found`);

  // 2. Get recent failed runs
  const runsRes = await api('GET', `/companies/${COMPANY}/heartbeat-runs?limit=50`);
  const recentRuns = runsRes.ok ? runsRes.data : [];
  const failedRuns = recentRuns.filter(r => r.status === 'failed');
  const failedByAgent = {};
  failedRuns.forEach(r => {
    if (!failedByAgent[r.agentId]) failedByAgent[r.agentId] = [];
    failedByAgent[r.agentId].push(r);
  });

  // 3. Get open issues
  const issuesRes = await api('GET', `/companies/${COMPANY}/issues`);
  const issues = issuesRes.ok ? issuesRes.data : [];
  const tasksByAgent = {};
  issues.filter(i => ['todo', 'in_progress', 'blocked'].includes(i.status)).forEach(i => {
    if (i.assigneeAgentId) {
      if (!tasksByAgent[i.assigneeAgentId]) tasksByAgent[i.assigneeAgentId] = [];
      tasksByAgent[i.assigneeAgentId].push(i);
    }
  });

  // 4. Per-agent healing
  for (const agent of agents) {
    const fixes = [];

    // Check adapter — must be ollama_local
    if (agent.adapterType !== 'ollama_local') {
      log(`🔧 ${agent.name}: Wrong adapter (${agent.adapterType}) → patching to ollama_local`);
      const res = await api('PATCH', `/agents/${agent.id}`, {
        adapterType: 'ollama_local',
        adapterConfig: { model: 'llama3' },
        runtimeConfig: OLLAMA_HEARTBEAT,
      });
      fixes.push(res.ok ? '✅ adapter fixed' : `❌ adapter fix failed: ${res.status}`);
      await new Promise(r => setTimeout(r, 300));
    }

    // Check heartbeat enabled
    const hb = agent.runtimeConfig?.heartbeat;
    if (!hb?.enabled) {
      log(`🔧 ${agent.name}: Heartbeat disabled → enabling`);
      const res = await api('PATCH', `/agents/${agent.id}`, { runtimeConfig: OLLAMA_HEARTBEAT });
      fixes.push(res.ok ? '✅ heartbeat enabled' : `❌ heartbeat fix failed: ${res.status}`);
      await new Promise(r => setTimeout(r, 300));
    }

    // Check error state
    if (agent.status === 'error') {
      log(`🔧 ${agent.name}: Status is error → attempting resume`);
      const res = await api('POST', `/agents/${agent.id}/resume`);
      fixes.push(res.ok ? '✅ resumed' : `❌ resume failed: ${res.status}`);
      await new Promise(r => setTimeout(r, 300));
    }

    // Check if agent has adapter_failed runs with "claude" 
    const agentFailed = failedByAgent[agent.id] || [];
    const claudeErrors = agentFailed.filter(r => r.errorCode === 'adapter_failed' && r.error?.includes('claude'));
    if (claudeErrors.length > 0 && agent.adapterType === 'ollama_local') {
      // Already fixed, just note it
      fixes.push(`ℹ️ ${claudeErrors.length} historical claude errors (already on ollama_local)`);
    }

    // Check if idle for too long with tasks assigned
    const agentTasks = tasksByAgent[agent.id] || [];
    const lastHb = agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt) : null;
    const idleMinutes = lastHb ? (Date.now() - lastHb.getTime()) / 60000 : 9999;

    if (agent.status === 'idle' && agentTasks.length > 0 && idleMinutes > 10) {
      log(`🔧 ${agent.name}: Idle ${Math.round(idleMinutes)}min with ${agentTasks.length} open tasks → force-waking`);
      const res = await api('POST', `/agents/${agent.id}/heartbeat/invoke`);
      fixes.push(res.ok ? `✅ woken (run: ${res.data.id?.substring(0,8)})` : `❌ wake failed: ${res.status}`);
      await new Promise(r => setTimeout(r, 300));
    }

    // Check if agent has NO tasks at all
    if (agentTasks.length === 0 && agent.status !== 'terminated') {
      log(`⚠️ ${agent.name}: No open tasks — creating a maintenance task`);
      const res = await api('POST', `/companies/${COMPANY}/issues`, {
        projectId: PROJECT,
        goalId: GOAL,
        title: `[${agent.name}] Status report and next steps`,
        description: `You are ${agent.name} (${agent.role}). With no current tasks assigned, review what has been done by your team so far in the 3D AI Organizers project. Write a brief status.md in your workspace summarizing:\n1. What the team has accomplished\n2. What you are capable of contributing\n3. Your proposed next 3 concrete tasks for yourself`,
        assigneeAgentId: agent.id,
        status: 'todo',
        priority: 'medium',
      });
      if (res.ok) {
        fixes.push(`✅ fallback task created: ${res.data.identifier}`);
        // Wake them immediately
        await new Promise(r => setTimeout(r, 400));
        const wakeRes = await api('POST', `/agents/${agent.id}/heartbeat/invoke`);
        fixes.push(wakeRes.ok ? `✅ woken` : `⚠️ wake skipped`);
      } else {
        fixes.push(`❌ task create failed: ${res.status} ${JSON.stringify(res.data).substring(0,80)}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (fixes.length > 0) {
      log(`  ${agent.name}: ${fixes.join(' | ')}`);
    } else {
      log(`  ✅ ${agent.name}: healthy (status:${agent.status}, tasks:${agentTasks.length})`);
    }
  }

  log('--- Watchdog cycle complete ---\n');
}

// Run once immediately
checkAndHeal().then(() => {
  // Then repeat every 90 seconds
  log('⏰ Watchdog scheduled: running every 90 seconds');
  setInterval(checkAndHeal, 90_000);
}).catch(e => {
  console.error('Watchdog fatal error:', e.message);
  process.exit(1);
});
