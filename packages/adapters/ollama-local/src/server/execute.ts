import {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import {
  asString,
  asNumber,
  asStringArray,
  buildPaperclipEnv,
  renderTemplate,
  parseObject,
} from "@paperclipai/adapter-utils/server-utils";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runtime, agent, onLog } = ctx;

  const url = asString(config.url, "http://127.0.0.1:11434");
  const model = asString(config.model, "gemma:7b");
  const numCtx = asNumber(config.num_ctx, 32768);
  const temperature = asNumber(config.temperature, 0.7);
  const cwd = asString(config.cwd, process.cwd());
  const promptTemplate = asString(config.promptTemplate, "You are agent {{agent.name}}. Complete your task:\n\n{{context.paperclipWake}}\n\nUse the 'run_bash' tool to execute shell commands and skills if needed.");

  const env = { ...process.env, ...buildPaperclipEnv(agent) };
  if (ctx.runId) env.PAPERCLIP_RUN_ID = ctx.runId;

  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId: ctx.runId,
    agent,
    context: ctx.context,
  };
  const prompt = renderTemplate(promptTemplate, templateData);

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const messages: any[] = Array.isArray(runtimeSessionParams.messages) ? runtimeSessionParams.messages : [];

  if (messages.length === 0) {
    messages.push({ role: "system", content: "You are a local autonomous Ollama-backed Paperclip agent. You have access to a tool called 'run_bash'. Use it to interact with the file system, compile code, execute scripts, and complete your tasks." });
  }

  if (prompt) {
    messages.push({ role: "user", content: prompt });
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "run_bash",
        description: "Executes a shell command on the host system. Use this to read/write files and run skills.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "The bash command to execute." },
          },
          required: ["command"],
        },
      },
    },
  ];

  await onLog("stdout", `[ollama-local] Starting Ollama agent loop using model ${model} at ${url} with num_ctx=${numCtx}\n`);
  
  if (ctx.onMeta) {
    await ctx.onMeta({
      adapterType: "ollama_local",
      command: "HTTP /api/chat",
      cwd,
      commandNotes: ["Native Ollama REST API Agent Loop"],
      commandArgs: [],
      env: {},
      prompt,
      promptMetrics: { promptChars: prompt.length },
      context: ctx.context,
    });
  }

  let timedOut = false;
  let usage = { inputTokens: 0, outputTokens: 0 };
  let finalResponse = "";

  let currentModel = model;
  const failedModels = new Set<string>();

  try {
    // Agent Loop, max 15 tool calls per run to avoid infinite loops
    for (let turn = 0; turn < 15; turn++) {
      const controller = new AbortController();
      const timeoutSec = asNumber(config.timeoutSec, 0);
      let timeoutId: NodeJS.Timeout | null = null;
      if (timeoutSec > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);
      }

      let res: Response;
      try {
        res = await fetch(`${url}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: currentModel,
            messages,
            tools,
            stream: false,
            options: {
              num_ctx: numCtx,
              temperature,
            },
          }),
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Ollama API error: ${res.statusText} ${await res.text()}`);
        }
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') throw fetchErr; // Genuine user timeout

        failedModels.add(currentModel);
        await onLog("stderr", `[ollama-local] ⚠️ Model '${currentModel}' failed (${fetchErr.message}). Searching for dynamic fallback...\n`);

        try {
          const tagsRes = await fetch(`${url}/api/tags`);
          if (!tagsRes.ok) throw new Error("Could not fetch tags for failover");
          
          const tagsData = await tagsRes.json();
          const installedModels = (tagsData.models || []).map((m: any) => m.name) as string[];
          
          const available = installedModels.filter(m => !failedModels.has(m) && m !== currentModel);
          if (available.length === 0) {
            throw new Error("No fallback models available. All iterations exhausted.");
          }

          // Prioritize: 1st cloud, 2nd gemma, 3rd llama, 4th anything
          let fallback = available.find(m => m.toLowerCase().includes("cloud"));
          if (!fallback) fallback = available.find(m => m.toLowerCase().includes("gemma"));
          if (!fallback) fallback = available.find(m => m.toLowerCase().includes("llama"));
          if (!fallback) fallback = available[0];

          await onLog("stdout", `[ollama-local] 🔄 DYNAMIC FAILOVER: Switching engine from '${currentModel}' to robust fallback '${fallback}'\n`);
          
          currentModel = fallback;
          if (timeoutId) clearTimeout(timeoutId);
          
          turn--; // Re-run this exact same turn again with the new model
          continue;
        } catch (fallbackErr) {
          throw fetchErr; // Pass up original error if failover routing fails
        }
      }

      const data = await res.json();
      const message = data.message;
      usage.inputTokens += data.prompt_eval_count || 0;
      usage.outputTokens += data.eval_count || 0;

      if (message.content) {
        await onLog("stdout", JSON.stringify({ kind: "assistant", text: message.content }) + "\n");
        finalResponse += message.content + "\n";
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          if (tc.function.name === "run_bash") {
            const cmd = tc.function.arguments.command;
            await onLog("stdout", JSON.stringify({ kind: "tool_call", name: "run_bash", input: { command: cmd } }) + "\n");
            
            let resultData;
            let isError = false;
            try {
              const { stdout, stderr } = await execAsync(cmd, { cwd, env });
              resultData = stdout + (stderr ? "\nSTDERR:\n" + stderr : "");
              if (!resultData) resultData = "Command executed successfully with no output.";
            } catch (err: any) {
              resultData = err.message + "\n" + (err.stdout || "") + "\n" + (err.stderr || "");
              isError = true;
            }

            // Truncate massively long tool outputs to avoid blowing up context
            if (resultData.length > 10000) {
              resultData = resultData.substring(0, 10000) + "\n...[TRUNCATED]";
            }

            await onLog("stdout", JSON.stringify({ kind: "tool_result", toolUseId: tc.id, content: resultData, isError }) + "\n");
            
            messages.push({
              role: "tool",
              content: resultData,
              name: tc.function.name,
            });
          }
        }
      } else {
        // No tool calls, AI is done responding
        break;
      }
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      provider: "ollama",
      model: currentModel,
      usage,
      sessionParams: { messages },
      summary: finalResponse.slice(0, 2000),
      resultJson: { result: finalResponse, usage },
    };

  } catch (err: any) {
    if (err.name === 'AbortError') {
      timedOut = true;
      return { exitCode: 1, signal: "SIGKILL", timedOut: true, errorMessage: "Ollama request timed out", sessionParams: { messages } };
    }
    await onLog("stderr", `[ollama-local] Exception in execution: ${err.message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: err.message, sessionParams: { messages } };
  }
}
