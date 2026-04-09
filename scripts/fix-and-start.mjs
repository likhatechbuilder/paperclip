/**
 * Paperclip Full Fix Script
 * TASK 1: Reassign Jules, James, Jasmine -> Nova
 * TASK 2: Assign tasks to each agent
 * TASK 3: Wake every agent
 */

const BASE = 'http://localhost:3100/api';
const COMPANY = '16ce14fb-40a6-4439-9bd8-4c5d2659ded6';
const PROJECT  = 'afbe53ea-e26a-45a7-b372-c4464f3bf0fe';
const GOAL     = 'e73cac8e-aab8-40d7-b4c7-721863db193b';

const AGENTS = {
  nova:    '85c02d02-33ab-4293-bf43-00fd2d1f5451',
  atlas:   '206e74c6-45a3-4d3b-87aa-a67fcc13bfa4',
  sentinel:'6ae07e77-86e9-4099-9a6d-b6860c6efe67',
  jules:   '2a6b5273-fcd9-47cc-b67d-4f3969e26fd7',
  james:   '8125d3b7-0698-41bf-8567-85362641b9d3',
  jasmine: 'd5e41bee-d540-4fd7-b9a0-1eb1f479d51b',
};

async function patch(path, body) {
  const r = await fetch(BASE + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`PATCH ${path} -> ${r.status}: ${JSON.stringify(json)}`);
  return json;
}

async function post(path, body = {}) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`POST ${path} -> ${r.status}: ${JSON.stringify(json)}`);
  return json;
}

async function run() {
  console.log('\n=== TASK 1: Reassign Jules/James/Jasmine -> Nova ===');
  for (const [name, id] of [['Jules', AGENTS.jules], ['James', AGENTS.james], ['Jasmine', AGENTS.jasmine]]) {
    try {
      const a = await patch(`/agents/${id}`, { reportsTo: AGENTS.nova });
      console.log(`  ✅ ${name} now reports to Nova`);
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== TASK 2: Create micro-tasks for every agent ===');
  const tasks = [
    {
      title: 'Review 3D-AI-Organizers repo structure and write architecture.md',
      description: 'You are Nova, Lead Architect. Clone or inspect the 3D-AI-Organizers project at https://github.com/BinqQarenYu/3D-Ai-Organizers.git. Create a file called architecture.md that documents the current repo structure, lists what folders and files exist, and proposes the next folder layout for a 3D visualization dashboard with React + Three.js frontend and Node.js backend.',
      assigneeAgentId: AGENTS.nova,
    },
    {
      title: 'Design component specification for 3D Dashboard\'s main view',
      description: 'You are Atlas, UI/UX Designer. Based on the project goal of building a "3D AI Organizers" dashboard, write a component-spec.md file that lists the main React components needed (e.g. SceneCanvas, ControlPanel, AgentCard, StatusOverlay). For each component, add a short description of its purpose, props, and visual style.',
      assigneeAgentId: AGENTS.atlas,
    },
    {
      title: 'Write Node.js project setup script for backend service',
      description: 'You are Sentinel, DevOps/Node.js expert. Write a setup.sh and a package.json for the backend Node.js service of the 3D AI Organizers project. The backend should expose a /health endpoint using Express. Include the pnpm commands to install and run it. Save these as setup.sh and backend-package.json in your workspace.',
      assigneeAgentId: AGENTS.sentinel,
    },
    {
      title: 'Document API contracts between frontend and backend',
      description: 'You are Jules, Senior Architect. Write an api-contracts.md file that defines the REST API endpoints the 3D AI Organizers frontend will call on the backend. Include at minimum: GET /health, GET /agents (list agents), GET /agents/:id/status, POST /agents/:id/task. For each endpoint include method, path, request body, and response shape.',
      assigneeAgentId: AGENTS.jules,
    },
    {
      title: 'Write Docker Compose configuration for the full stack',
      description: 'You are James, DevOps Engineer. Write a docker-compose.yml that starts the full 3D AI Organizers stack: a frontend (React/Vite, port 5173), a backend (Node.js/Express, port 3000), and a Paperclip engine (port 3100). Save it to your workspace as docker-compose.yml and explain each service.',
      assigneeAgentId: AGENTS.james,
    },
    {
      title: 'Research and write a technology comparison: Three.js vs Babylon.js for 3D org charts',
      description: 'You are Jasmine, Data Engineer and Researcher. Write a research report (tech-comparison.md) comparing Three.js and Babylon.js for building 3D organizational chart visualizations. Consider: performance with 50+ nodes, ease of React integration, community support, and license. End with a recommendation.',
      assigneeAgentId: AGENTS.jasmine,
    },
  ];

  const created = [];
  for (const t of tasks) {
    try {
      const issue = await post(`/companies/${COMPANY}/issues`, {
        projectId: PROJECT,
        goalId: GOAL,
        title: t.title,
        description: t.description,
        assigneeAgentId: t.assigneeAgentId,
        status: 'todo',
        priority: 'high',
      });
      console.log(`  ✅ Created ${issue.identifier}: "${t.title.substring(0,50)}..." -> ${issue.assigneeAgentId.substring(0,8)}`);
      created.push(issue);
    } catch (e) {
      console.log(`  ❌ Failed to create task "${t.title.substring(0,40)}": ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n=== TASK 3: Wake all agents ===');
  for (const [name, id] of Object.entries(AGENTS)) {
    try {
      const run = await post(`/agents/${id}/heartbeat/invoke`);
      console.log(`  ✅ ${name} woken up (run: ${run.id?.substring(0,8)}, status: ${run.status})`);
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n=== DONE ===');
  console.log(`Total tasks created: ${created.length}/6`);
  console.log('Visit http://localhost:3100 to monitor your team');
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
