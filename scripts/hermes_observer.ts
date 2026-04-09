import fs from "node:fs";

const PAPERCLIP_API = "http://127.0.0.1:3100/api";
const OLLAMA_API = "http://127.0.0.1:11434/api/generate";
const OLLAMA_MODEL = process.env.HERMES_MODEL || "llama3";

/**
 * Hermes Observer Loop
 * This standalone script connects Paperclip organizational logs directly to a local Ollama model.
 * It simulates an "Organizational Overseer" parsing heartbeat data for efficiencies.
 */

async function runObserver() {
  console.log("👁️  Starting Hermes Observer Loop...");

  // 1. Fetch Company
  const companiesRes = await fetch(`${PAPERCLIP_API}/companies`);
  if (!companiesRes.ok) {
    throw new Error(`Paperclip API not responding: ${companiesRes.statusText}`);
  }
  const companies = await companiesRes.json();
  if (!companies || companies.length === 0) {
    console.log("No companies found in Paperclip. Please create one.");
    return;
  }
  const companyId = companies[0].id;
  console.log(`✅ Hooked into Company: ${companies[0].name} (${companyId})`);

  // 2. Fetch Telemetry
  console.log("📡 Pulling latest agent cognitive telemetry...");
  const telemetryRes = await fetch(`${PAPERCLIP_API}/companies/${companyId}/telemetry?limit=10`);
  if (!telemetryRes.ok) {
    throw new Error(`Failed to fetch telemetry: ${telemetryRes.statusText}`);
  }
  const telemetry = await telemetryRes.json();
  if (telemetry.length === 0) {
    console.log("ℹ️ No logs found. Agents have not done any work yet.");
    return;
  }

  let contextBlock = "";
  telemetry.forEach((t: any) => {
      // Capture ALL events for aggressive deep-debugging
      const msg = t.message || JSON.stringify(t.payload || t);
      contextBlock += `[${new Date(t.createdAt).toISOString()}] Agent ${t.agentId} [${t.eventType}]: ${msg}\n`;
  });

  if (contextBlock.length < 10) {
     contextBlock = "The system has been idle. Review the organizational structure and propose one hypothetical bug fix rule to ensure database architecture safety.";
  }

  console.log("🧠 Transmitting cognitive logs to Hermes...");
  const prompt = `You are Hermes, the AI Chairman and Organizational Overseer. Read the recent internal monologues (thoughts) and actions (tools) from the agents working today.
Your goal is to look over the "whole office":
1. Identify inefficiencies, redundant steps, or missing "Skills" that would make agents faster.
2. Pinpoint exactly where things are wrong or not working (stalled issues, dropped requests, repeating error loops).

Logs:
${contextBlock.substring(0, 8000)}

Output purely a structured JSON response identifying a new organizational rule, skill, or direct bug fix.
FORMAT exactly like this:
{
  "title": "A short 3-word title",
  "suggestion": "### 📢 Report to the Board\\n\\n**What is Happening:**\\n(Explain clearly what the agents are struggling with or where the bug is.)\\n\\n**My Advice:**\\n(Explain the exact rule or fix strategy that must be adopted.)\\n\\n**Action Taken:**\\nI have officially dispatched a High-Priority Repair Ticket to the developer agents to implement this."
}

Do not include any text outside the JSON.`;

  // 4. Hit Ollama (long timeout for CPU inference)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min timeout
  const ollamaRes = await fetch(OLLAMA_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      format: "json",
      stream: false
    })
  });
  clearTimeout(timeout);

  if (!ollamaRes.ok) {
     throw new Error(`Ollama failed: ${ollamaRes.statusText}`);
  }
  const ollamaData = await ollamaRes.json();
  
  let insight;
  try {
     insight = JSON.parse(ollamaData.response);
  } catch (err) {
     throw new Error(`Ollama did not return pure JSON: ${ollamaData.response}`);
  }

  console.log(`💡 Hermes Insight Generated: "${insight.title}"`);

  // 5. Post to Paperclip Approvals (For Human Review)
  console.log("📬 Proposing Insight to the Board...");
  const approvalRes = await fetch(`${PAPERCLIP_API}/companies/${companyId}/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "approve_observer_insight",
      payload: {
        title: insight.title,
        suggestion: insight.suggestion
      }
    })
  });

  if (!approvalRes.ok) {
      const errTxt = await approvalRes.text();
      throw new Error(`Paperclip rejected the approval: ${errTxt}`);
  }

  // 6. Actionable Solution: Create a Bug-Fix Issue so Agents can actually DO something
  console.log("🛠️ Dispatching active Repair Ticket to Agents...");
  const issueRes = await fetch(`${PAPERCLIP_API}/companies/${companyId}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `[Hermes Watchtower] ${insight.title}`,
      description: `**Hermes Systemic Diagnosis:**\n\n${insight.suggestion}\n\n*Please implement this fix immediately to restore systemic efficiency.*`,
      priority: "high",
    })
  });

  if (!issueRes.ok) {
     console.warn(`⚠️ Failed to throw issue to agents: ${await issueRes.text()}`);
  } else {
     console.log("✅ Repair Ticket officially assigned into the workforce backlog!");
  }

  console.log("✅ Observer Cycle Complete!");
}

async function main() {
  const isDaemon = process.argv.includes("--daemon");

  if (isDaemon) {
    console.log("🚀 Starting Hermes Observer in DAEMON MODE. Running every 5 minutes...");
    // Run immediately, then interval
    try { await runObserver(); } catch(e: any) { console.error("❌ Observer Error Loop Triggered:", e.message); }
    
    setInterval(async () => {
      try {
        await runObserver();
      } catch (err: any) {
        console.error("❌ Observer Error Loop Triggered:", err.message);
      }
    }, 5 * 60 * 1000);
  } else {
    runObserver().catch(err => {
      console.error("❌ Observer Error Loop Triggered:", err.message);
    });
  }
}

main();
