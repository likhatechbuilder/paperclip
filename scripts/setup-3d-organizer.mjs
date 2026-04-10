/**
 * setup-3d-organizer.mjs
 * 
 * Creates a "3D Organizer" company in Paperclip and hires 3 Ollama-powered agents.
 * Run with:  node scripts/setup-3d-organizer.mjs
 * 
 * Requires: Paperclip server running on http://localhost:3100
 */

const BASE = process.env.PAPERCLIP_URL || "http://localhost:3100";
const API = `${BASE}/api`;

async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── 1. Create company ─────────────────────────────────────────────────────
console.log("\n┌──────────────────────────────────────────────────┐");
console.log("│  🏗️   Setting up 3D Organizer company             │");
console.log("└──────────────────────────────────────────────────┘\n");

const company = await api("POST", "/companies", {
  name: "3D Organizer",
  description: "AI-powered 3D printing project organizer — local Ollama agents manage design, engineering, and quality.",
  budgetMonthlyCents: 0,  // No cloud costs — Ollama is free
});

console.log(`✅  Company created: "${company.name}" (${company.id})`);

// ─── 2. Hire agents ─────────────────────────────────────────────────────────

const agentDefs = [
  {
    name: "Atlas",
    role: "engineer",
    title: "Lead 3D Engineer",
    icon: "wrench",
    adapterType: "ollama_local",
    adapterConfig: {
      endpointUrl: "http://localhost:11434",
      model: "llama3",
      system: "You are Atlas, a senior 3D printing engineer. You specialize in CAD model analysis, slicing optimization, and print parameter tuning. You write clean, well-documented technical reports.",
    },
    metadata: {
      specialty: "3D model analysis & print optimization",
      note: "Change model from Paperclip dashboard → Agents → Atlas → Config",
    },
  },
  {
    name: "Nova",
    role: "designer",
    title: "Creative Director",
    icon: "sparkles",
    adapterType: "ollama_local",
    adapterConfig: {
      endpointUrl: "http://localhost:11434",
      model: "llama3",
      system: "You are Nova, a creative director for a 3D printing company. You focus on design aesthetics, user experience, and visual storytelling. You create compelling project briefs and design specifications.",
    },
    metadata: {
      specialty: "Design systems & creative direction",
      note: "Change model from Paperclip dashboard → Agents → Nova → Config",
    },
  },
  {
    name: "Sentinel",
    role: "qa",
    title: "Quality Assurance Lead",
    icon: "shield",
    adapterType: "ollama_local",
    adapterConfig: {
      endpointUrl: "http://localhost:11434",
      model: "llama3",
      system: "You are Sentinel, a quality assurance lead for a 3D printing company. You review designs for structural integrity, flag manufacturing risks, and maintain quality standards. You write detailed QA checklists and review reports.",
    },
    metadata: {
      specialty: "Quality control & risk assessment",
      note: "Change model from Paperclip dashboard → Agents → Sentinel → Config",
    },
  },
];

console.log("\nHiring agents...\n");

const hired = [];
for (const def of agentDefs) {
  const res = await api("POST", `/companies/${company.id}/agent-hires`, def);
  const agent = res.agent;
  hired.push(agent);
  console.log(`  🤖  ${def.icon === "wrench" ? "🔧" : def.icon === "sparkles" ? "✨" : "🛡️"}  ${agent.name} — ${agent.title} (${agent.role})`);
  console.log(`      adapter: ollama_local | model: ${def.adapterConfig.model}`);
  console.log(`      id: ${agent.id}\n`);
}

// ─── 3. Summary ─────────────────────────────────────────────────────────────

console.log("┌──────────────────────────────────────────────────┐");
console.log("│  ✅  3D Organizer is live!                        │");
console.log("└──────────────────────────────────────────────────┘");
console.log(`
  Company : ${company.name}
  Agents  : ${hired.map(a => a.name).join(", ")}
  Adapter : ollama_local (all 3)
  Model   : llama3 (change in dashboard)

  🔗  Open dashboard: ${BASE}

  To change an agent's model:
    Dashboard → Agents → [agent name] → Config → Model field
    (Set to any model you've pulled: mistral, codellama, gemma, etc.)

  Make sure Ollama is running:
    $ ollama serve
    $ ollama pull llama3    # if not already pulled
`);
