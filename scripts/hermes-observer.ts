/**
 * hermes-observer.ts — The Observer God Daemon
 *
 * Hermes is NOT an agent. Hermes is the system-level overseer hardcoded into
 * the Paperclip platform. It watches ALL active companies, analyzes agent
 * telemetry via Ollama, detects mistakes/inefficiencies, and proposes
 * improvements through the Approval system (human-in-the-loop).
 *
 * Architecture:
 *   Telemetry API → chunk → Ollama LLM → parse insight → POST /approvals
 *
 * Usage:
 *   pnpm observer:start
 *   pnpm observer:start -- --model llama3.1 --interval 900
 *   OBSERVER_MODEL=gemma4 pnpm observer:start
 */

import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

// ─── Configuration ──────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");

const CONFIG = {
  /** Paperclip API base URL */
  paperclipUrl: process.env.PAPERCLIP_URL ?? "http://localhost:3100",

  /** Ollama API base URL */
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",

  /** Ollama model to use for analysis */
  model: process.env.OBSERVER_MODEL ?? "llama3.1",

  /** Observation interval in seconds (default: 15 minutes) */
  intervalSeconds: parseInt(process.env.OBSERVER_INTERVAL ?? "900", 10),

  /** Maximum telemetry events per fetch */
  telemetryLimit: parseInt(process.env.OBSERVER_TELEMETRY_LIMIT ?? "200", 10),

  /** Maximum insights per observation cycle (rate limiting) */
  maxInsightsPerCycle: parseInt(process.env.OBSERVER_MAX_INSIGHTS ?? "3", 10),

  /** Maximum context tokens to send to LLM (approximate, by chars) */
  maxContextChars: parseInt(process.env.OBSERVER_MAX_CONTEXT_CHARS ?? "12000", 10),

  /** Dry run — analyze but don't submit approvals */
  dryRun: process.env.OBSERVER_DRY_RUN === "true",
};

// Parse CLI flags
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  const next = process.argv[i + 1];
  if (arg === "--model" && next) { CONFIG.model = next; i++; }
  else if (arg === "--interval" && next) { CONFIG.intervalSeconds = parseInt(next, 10); i++; }
  else if (arg === "--dry-run") { CONFIG.dryRun = true; }
  else if (arg === "--limit" && next) { CONFIG.telemetryLimit = parseInt(next, 10); i++; }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  status: string;
}

interface TelemetryEvent {
  id: string;
  runId: string;
  agentId: string;
  seq: number;
  eventType: string;
  stream: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

interface ActivityEvent {
  id: string;
  action: string;
  actorType: string;
  actorId: string;
  agentId: string | null;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface ObserverInsight {
  title: string;
  observation: string;
  category: "mistake" | "inefficiency" | "skill" | "convention";
  severity: "low" | "medium" | "high";
  autoApply?: {
    action: "append_to_file" | "create_skill";
    target: string;
    content: string;
  };
}

// ─── HTTP Helpers ───────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ─── Context Loader ─────────────────────────────────────────────────────────

function loadOrganizationalKnowledge(): string {
  const files = [
    "doc/mistakes.md",
    "CONVENTIONS.md",
  ];

  let knowledge = "";
  for (const file of files) {
    const abs = path.join(ROOT, file);
    if (fs.existsSync(abs)) {
      const content = fs.readFileSync(abs, "utf-8");
      // Truncate each file to keep total context manageable
      const truncated = content.slice(0, 3000);
      knowledge += `\n--- ${file} ---\n${truncated}\n`;
    }
  }
  return knowledge;
}

// ─── Hermes Persona (System Prompt) ─────────────────────────────────────────

function buildSystemPrompt(companyName: string, orgKnowledge: string): string {
  return `You are the Chairman, the Observer God of the Paperclip platform.

## YOUR ROLE
You are the SYSTEM-LEVEL OVERSEER named Chairman. You are NOT a standard agent. You sit ABOVE all agents.
You observe the telemetry and activity logs of ALL agents in the company "${companyName}".
You look for errors, analyze mistakes, and formulate solutions to recommend to the Board (user). Your primary recommendation should be what skills need to be revised or added to specific agents to improve their core capacities and efficiency.
You NEVER interfere with active work. You NEVER take issues. You NEVER write code.
You ONLY observe, analyze, and propose improvements.

## WHAT YOU LOOK FOR
1. **STAGNANT AGENTS** — If an agent (especially the CEO) has no work or very few events, ask them to work and wake them up by assigning them a task.
2. **MISSING SKILLS OR RIGHTS** — If an agent lacks the skill to do something (e.g. rights to hire), you must give them skills, or update their agent capabilities.
3. **REPEATED MISTAKES** — the same error across multiple agents or sessions
4. **INEFFICIENT PATTERNS** — agents taking 10 steps when 2 would suffice
5. **TOOL MISUSE** — using the wrong tool for the job
6. **CONVENTION VIOLATIONS** — not following established CONVENTIONS.md
7. **CONTEXT EXHAUSTION** — agents losing focus and looping
8. **HALLUCINATION** — agents referencing files/functions that don't exist
## YOUR ORGANIZATIONAL KNOWLEDGE
${orgKnowledge}

## YOUR OUTPUT FORMAT
If you detect an actionable insight, respond with EXACTLY this JSON format:
\`\`\`json
{
  "insights": [
    {
      "title": "Short title of the insight",
      "observation": "What you observed across the telemetry",
      "category": "mistake|inefficiency|skill|convention",
      "severity": "low|medium|high",
      "autoApply": {
        "action": "append_to_file | create_skill | update_agent | create_task",
        "target": "doc/mistakes.md, CONVENTIONS.md, a skill slug, or an agent shortname (e.g., 'ceo')",
        "content": "For files/skills: The exact markdown. For update_agent: A JSON string containing patch fields (e.g. `{\"permissions\": {\"canCreateAgents\": true}}`). For create_task: A text description of the directive/issue you are assigning to them."
      }
    }
  ]
}
\`\`\`

If you detect NO actionable insights, respond with:
\`\`\`json
{"insights": []}
\`\`\`

RULES:
- Maximum ${CONFIG.maxInsightsPerCycle} insights per analysis.
- Only report HIGH-CONFIDENCE observations. Never speculate.
- Focus on PATTERNS, not one-off events. A single error is not an insight.
- Be ruthlessly precise. No fluff, no pleasantries.
- Your proposed actions must be specific enough to be copy-pasted into the repo.`;
}

// ─── Telemetry Formatter ────────────────────────────────────────────────────

function formatTelemetryForLLM(events: TelemetryEvent[]): string {
  if (events.length === 0) return "(No telemetry events in this window)";

  let output = "";
  let totalChars = 0;

  for (const evt of events) {
    const line = `[${evt.createdAt}] agent=${evt.agentId?.slice(0, 8)} type=${evt.eventType} stream=${evt.stream ?? "-"} | ${(evt.message ?? "").slice(0, 300)}\n`;
    totalChars += line.length;
    if (totalChars > CONFIG.maxContextChars) {
      output += `\n... (${events.length - output.split("\n").length} more events truncated to fit context window)\n`;
      break;
    }
    output += line;
  }
  return output;
}

function formatActivityForLLM(events: ActivityEvent[]): string {
  if (events.length === 0) return "(No activity events)";

  let output = "";
  for (const evt of events.slice(0, 50)) {
    output += `[${evt.createdAt}] action=${evt.action} actor=${evt.actorType}:${evt.actorId?.slice(0, 8)} entity=${evt.entityType}:${evt.entityId?.slice(0, 8)}\n`;
  }
  return output;
}

// ─── Ollama Inference (node:http for Windows TCP timeout survival) ───────────

interface OllamaRequest {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  numPredict: number;
}

/**
 * Use node:http directly instead of fetch for Ollama generate requests.
 * Reason: Windows TCP KeepAliveTime default is 5 minutes. Node's fetch
 * inherits this OS-level timeout and drops connections during cold model
 * loads (which can take 2-8 minutes depending on GPU/model size).
 * node:http lets us set socket.setTimeout() explicitly.
 */
function ollamaGenerateStreaming(req: OllamaRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${CONFIG.ollamaUrl}/api/generate`);
    const payload = JSON.stringify({
      model: req.model,
      system: req.system,
      prompt: req.prompt,
      stream: true,
      options: {
        temperature: req.temperature,
        num_predict: req.numPredict,
      },
    });

    const httpReq = http.request(
      {
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => reject(new Error(`Ollama HTTP ${res.statusCode}: ${body}`)));
          return;
        }

        // Set socket timeout to 10 minutes — survives model cold load
        res.socket?.setTimeout(10 * 60 * 1000);

        let fullResponse = "";
        let tokenCount = 0;

        res.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8");
          for (const line of text.split("\n")) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullResponse += parsed.response;
                tokenCount++;
              }
            } catch {
              // Partial JSON chunk — will complete on next data event
            }
          }
        });

        res.on("end", () => {
          log(`   🧠 Ollama responded (${tokenCount} tokens streamed)`);
          resolve(fullResponse);
        });

        res.on("error", (err) => reject(err));
      },
    );

    // Set request-side socket timeout too
    httpReq.setTimeout(10 * 60 * 1000, () => {
      httpReq.destroy(new Error("Ollama request timed out after 10 minutes"));
    });

    httpReq.on("error", (err) => reject(err));
    httpReq.write(payload);
    httpReq.end();
  });
}

async function analyzeWithOllama(
  systemPrompt: string,
  telemetryText: string,
  activityText: string,
  llmModel: string
): Promise<ObserverInsight[]> {
  const userPrompt = `## TELEMETRY (agent thoughts, tool calls, errors)
${telemetryText}

## ACTIVITY LOG (structured actions)
${activityText}

Analyze the above. Report any actionable insights as JSON.`;

  try {
    log(`   🧠 Sending to Ollama (${llmModel})... this may take a few minutes.`);

    // Use node:http with explicit socket timeout to survive Windows TCP
    // KeepAliveTime (default 5min). Node fetch inherits OS-level timeouts
    // which kill long-running Ollama model loads.
    const text = await ollamaGenerateStreaming({
      model: llmModel,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      numPredict: 2048,
    });

    // Parse JSON from the accumulated response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*"insights"[\s\S]*\}/);

    if (!jsonMatch) {
      log("⚠️  LLM response did not contain parseable JSON");
      log(`   Raw response (first 500 chars): ${text.slice(0, 500)}`);
      return [];
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed.insights)) {
      log("⚠️  LLM response missing 'insights' array");
      return [];
    }

    return (parsed.insights as ObserverInsight[]).slice(0, CONFIG.maxInsightsPerCycle);
  } catch (err) {
    log(`❌ Ollama inference failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ─── Approval Submission ────────────────────────────────────────────────────

async function submitInsightAsApproval(
  companyId: string,
  insight: ObserverInsight,
): Promise<void> {
  if (CONFIG.dryRun) {
    log(`   🔸 [DRY RUN] Would submit: "${insight.title}" (${insight.category}/${insight.severity})`);
    return;
  }

  try {
    await postJson(`${CONFIG.paperclipUrl}/api/companies/${companyId}/approvals`, {
      type: "approve_observer_insight",
      title: `[Chairman] ${insight.title}`,
      payload: {
        observerVersion: "1.0.0",
        category: insight.category,
        severity: insight.severity,
        observation: insight.observation,
        autoApply: insight.autoApply,
        analyzedAt: new Date().toISOString(),
        model: CONFIG.model,
      },
      status: "pending",
    });
    log(`   ✅ Submitted approval: "${insight.title}"`);
  } catch (err) {
    log(`   ❌ Failed to submit approval: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Logging ────────────────────────────────────────────────────────────────

function log(msg: string): void {
  const ts = new Date().toISOString().replace("T", " ").replace(/\.\d+Z/, "Z");
  console.log(`[hermes-observer ${ts}] ${msg}`);
}

// ─── Observation Cycle ──────────────────────────────────────────────────────

async function observeCompany(company: Company, orgKnowledge: string, modelOverride?: string): Promise<number> {
  const llmModel = modelOverride ?? CONFIG.model;
  log(`🔍 Observing "${company.name}" (${company.id.slice(0, 8)}...)`);

  // 1. Fetch telemetry
  let telemetryEvents: TelemetryEvent[] = [];
  try {
    telemetryEvents = await fetchJson<TelemetryEvent[]>(
      `${CONFIG.paperclipUrl}/api/companies/${company.id}/telemetry?limit=${CONFIG.telemetryLimit}`,
    );
  } catch (err) {
    log(`   ⚠️  Telemetry fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Fetch activity
  let activityEvents: ActivityEvent[] = [];
  try {
    activityEvents = await fetchJson<ActivityEvent[]>(
      `${CONFIG.paperclipUrl}/api/companies/${company.id}/activity`,
    );
  } catch (err) {
    log(`   ⚠️  Activity fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Skip if no data
  if (telemetryEvents.length === 0 && activityEvents.length === 0) {
    log(`   ℹ️  No telemetry/activity data. Skipping.`);
    return 0;
  }

  log(`   📊 ${telemetryEvents.length} telemetry events, ${activityEvents.length} activity events`);

  // 4. Build context and analyze
  const systemPrompt = buildSystemPrompt(company.name, orgKnowledge);
  const telemetryText = formatTelemetryForLLM(telemetryEvents);
  const activityText = formatActivityForLLM(activityEvents);

  const insights = await analyzeWithOllama(systemPrompt, telemetryText, activityText, llmModel);

  // 5. Submit insights as approvals
  if (insights.length === 0) {
    log(`   ✨ No actionable insights detected. Organization is clean.`);
    return 0;
  }

  log(`   🎯 ${insights.length} insight(s) detected:`);
  for (const insight of insights) {
    log(`   → [${insight.severity.toUpperCase()}] ${insight.title} (${insight.category})`);
    await submitInsightAsApproval(company.id, insight);
  }

  return insights.length;
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log("===============================================================");
  log("  CHAIRMAN OBSERVER GOD - Paperclip Platform Overseer v1.0.0");
  log("===============================================================");
  log(`  Model:      ${CONFIG.model}`);
  log(`  Ollama:     ${CONFIG.ollamaUrl}`);
  log(`  Paperclip:  ${CONFIG.paperclipUrl}`);
  log(`  Interval:   ${CONFIG.intervalSeconds}s (${Math.round(CONFIG.intervalSeconds / 60)}min)`);
  log(`  Max insights/cycle: ${CONFIG.maxInsightsPerCycle}`);
  log(`  Dry run:    ${CONFIG.dryRun}`);
  log("═══════════════════════════════════════════════════════════════");

  // Verify Ollama is reachable
  try {
    await fetchJson(`${CONFIG.ollamaUrl}/api/tags`);
    log("✅ Ollama is reachable");
  } catch {
    log("❌ Ollama is NOT reachable. Start Ollama first.");
    process.exit(1);
  }

  // Verify Paperclip is reachable
  try {
    await fetchJson(`${CONFIG.paperclipUrl}/api/health`);
    log("✅ Paperclip is reachable");
  } catch {
    log("❌ Paperclip is NOT reachable. Start with `pnpm dev` first.");
    process.exit(1);
  }

  // Load organizational knowledge (static — reloaded each cycle)
  log("📚 Loading organizational knowledge...");

  // Main observation loop
  let cycleCount = 0;
  const runCycle = async () => {
    cycleCount++;
    log(`\n──── Observation Cycle #${cycleCount} ────`);

    // Refresh org knowledge each cycle (in case mistakes.md was updated)
    const orgKnowledge = loadOrganizationalKnowledge();

    // Fetch all active companies
    let companies: Company[] = [];
    try {
      companies = await fetchJson<Company[]>(`${CONFIG.paperclipUrl}/api/companies`);
      companies = companies.filter((c) => c.status === "active");
    } catch (err) {
      log(`❌ Failed to fetch companies: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (companies.length === 0) {
      log("ℹ️  No active companies found. Nothing to observe.");
      return;
    }

    log(`👁️  Observing ${companies.length} active company(ies)...`);

    let totalInsights = 0;
    for (const company of companies) {
      let modelOverride: string | undefined = undefined;

      // Check if a Chairman agent exists in the DB to control execution
      try {
        const agents = await fetchJson<any[]>(`${CONFIG.paperclipUrl}/api/companies/${company.id}/agents`);
        // Finding Chairman globally within this company
        const hermesAgent = agents.find((a: any) => a.name.toLowerCase() === "chairman" || a.title?.toLowerCase() === "chairman" || a.title?.toLowerCase() === "observer god");
        
        if (hermesAgent) {
          if (hermesAgent.status === "paused" || hermesAgent.status === "terminated") {
            log(`   ⏸️  Chairman agent in ${company.name} is paused. Skipping.`);
            continue; // Skip observation
          }
          if (hermesAgent.adapterConfig?.model) {
            modelOverride = String(hermesAgent.adapterConfig.model);
          }
        } else {
          // Auto-seed Chairman
          try {
            log(`   🌱 Seeding Chairman agent into "${company.name}"...`);
            await postJson(`${CONFIG.paperclipUrl}/api/companies/${company.id}/agents`, {
              name: "Chairman",
              title: "Chairman",
              role: "general",
              adapterType: "process",
              adapterConfig: {
                model: CONFIG.model,
              },
              icon: "eye",
              capabilities: "System level platform observation daemon. Oversees operations, looks for errors across telemetry, formulates solutions, recommends agent skill revisions to improve efficiency, and asks for Human/Board approval for system enhancements.",
              desiredSkills: ["observe", "recommend", "skill-analysis", "error-detection"]
            });
            log(`   ✅ Chairman agent seeded.`);
          } catch (seedErr) {
            log(`   ⚠️ Failed to seed Chairman: ${seedErr instanceof Error ? seedErr.message : String(seedErr)}`);
          }
        }
      } catch (err) {
        log(`   ⚠️ Failed to verify Chairman agent status: ${err instanceof Error ? err.message : String(err)}`);
      }

      const count = await observeCompany(company, orgKnowledge, modelOverride);
      totalInsights += count;
    }

    log(`\n──── Cycle #${cycleCount} complete: ${totalInsights} insight(s) across ${companies.length} company(ies) ────`);
  };

  // Run first cycle immediately
  await runCycle();

  // Schedule subsequent cycles
  log(`\n⏰ Next observation in ${CONFIG.intervalSeconds}s (${Math.round(CONFIG.intervalSeconds / 60)}min)...`);
  setInterval(async () => {
    try {
      await runCycle();
      log(`\n⏰ Next observation in ${CONFIG.intervalSeconds}s (${Math.round(CONFIG.intervalSeconds / 60)}min)...`);
    } catch (err) {
      log(`❌ Cycle failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, CONFIG.intervalSeconds * 1000);
}

main().catch((err) => {
  log(`💀 Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
