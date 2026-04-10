import path from "node:path";
import fs from "node:fs/promises";
import {
  asString,
  asNumber,
  asStringArray,
  parseObject,
  renderTemplate,
  buildPaperclipEnv,
} from "@paperclipai/adapter-utils/server-utils";
import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@paperclipai/adapter-utils";
import { DEFAULT_EINSTEIN_MODEL } from "../index.js";
import { TOOL_DEFINITIONS, executeTool } from "../tools.js";
import type { ToolCallArgs } from "../tools.js";

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, string>;
  };
}

interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export async function execute(
  ctx: AdapterExecutionContext
): Promise<AdapterExecutionResult> {
  const { config, agent, context, onLog, onMeta, runId } = ctx;

  const endpointUrl = asString(config.endpointUrl, "http://localhost:11434").replace(/\/$/, "");
  const model = asString(config.model, DEFAULT_EINSTEIN_MODEL);
  const maxTurns = asNumber(config.maxTurns, 15);
  const commandWhitelist = asStringArray(config.commandWhitelist);
  const promptTemplate = asString(
    config.promptTemplate,
    "You are {{agent.name}}, a Paperclip agent (role: {{agent.role}}). You have real tools to read/write files, run commands, and fetch URLs. Use them to complete your tasks. Continue your work."
  );
  const systemPrompt = asString(
    config.system,
    `You are a skilled AI agent with access to tools for interacting with the local filesystem and terminal. When given a task, use the available tools to accomplish it. Always prefer using tools over describing what you would do. Be concise and action-oriented.

IMPORTANT: When you need to read a file, use the read_file tool. When you need to create or modify a file, use the write_file tool. When you need to run git, npm, or other commands, use the run_command tool.`
  );
  const options = parseObject(config.options);

  // Resolve workspace CWD
  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const configuredCwd = asString(config.cwd, "");
  const cwd = workspaceCwd || configuredCwd || process.cwd();

  const prompt = renderTemplate(promptTemplate, {
    agent,
    context,
    run: { id: runId },
  });

  const env = buildPaperclipEnv(agent);

  if (onMeta) {
    await onMeta({
      adapterType: "einstein_hand",
      command: `Ollama ${model} + Tools`,
      commandArgs: [endpointUrl],
      cwd,
      env,
    });
  }

  await onLog("stdout", `[einstein] Starting agentic run with model "${model}" in workspace "${cwd}"\n`);
  await onLog("stdout", `[einstein] Tools available: ${TOOL_DEFINITIONS.map(t => t.function.name).join(", ")}\n`);

  const historyFile = path.join(cwd, `.einstein_history_${agent.id}.json`);
  let messages: OllamaMessage[] = [];

  // 1. Checkpoint Recovery (The Memory Bank)
  try {
    const saved = await fs.readFile(historyFile, "utf-8");
    messages = JSON.parse(saved);
    await onLog("stdout", `[einstein] 💾 Resuming from previous checkpoint! Found ${messages.length} messages.\n`);
  } catch {
    // 2. Start Fresh
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalText = "";
  let turn = 0;

  try {
    while (turn < maxTurns) {
      turn++;
      await onLog("stdout", `\n[einstein] === Turn ${turn}/${maxTurns} ===\n`);

      // Call Ollama with tools (non-streaming for tool calls)
      const response = await fetch(`${endpointUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          tools: TOOL_DEFINITIONS,
          stream: false,
          options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          exitCode: 1,
          signal: null,
          timedOut: false,
          errorMessage: `Ollama API error (${response.status}): ${errorText}`,
        };
      }

      const data = (await response.json()) as OllamaChatResponse;
      totalInputTokens += data.prompt_eval_count ?? 0;
      totalOutputTokens += data.eval_count ?? 0;

      const assistantMessage = data.message;

      // Add assistant message to history
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
        tool_calls: assistantMessage.tool_calls,
      });

      // Check if the model wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = toolCall.function.arguments as ToolCallArgs;

          await onLog(
            "stdout",
            `[einstein] 🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs).substring(0, 200)})\n`
          );

          // Execute the tool
          const toolResult = await executeTool(toolName, toolArgs, {
            cwd,
            commandWhitelist: commandWhitelist.length > 0 ? commandWhitelist : undefined,
          });

          // Log result (truncated for readability)
          const resultPreview = toolResult.length > 300
            ? toolResult.substring(0, 300) + "..."
            : toolResult;
          await onLog("stdout", `[einstein] 📋 Result: ${resultPreview}\n`);

          messages.push({
            role: "tool",
            content: toolResult,
          });
        }

        // Save Checkpoint
        await fs.writeFile(historyFile, JSON.stringify(messages, null, 2), "utf-8");

        // Continue the loop — let the model process tool results
        continue;
      }

      // No tool calls — the model gave a final text response
      finalText = assistantMessage.content || "";
      await onLog("stdout", `\n[einstein] 💬 Final response:\n${finalText}\n`);
      
      // Clear Checkpoint on Success
      await fs.rm(historyFile, { force: true }).catch(() => {});
      break;
    }

    if (turn >= maxTurns) {
      await onLog("stdout", `\n[einstein] ⚠️ Reached max turns (${maxTurns}). Stopping.\n`);
      finalText = finalText || "(Reached maximum tool-call turns)";
    }

    await onLog(
      "stdout",
      `\n[einstein] ✅ Run complete. Turns: ${turn}, Input tokens: ${totalInputTokens}, Output tokens: ${totalOutputTokens}\n`
    );

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: finalText,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      provider: "ollama",
      model,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await onLog("stderr", `[einstein] ❌ Error: ${errorMessage}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage,
    };
  }
}
