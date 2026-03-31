import { 
  asString, 
  asNumber, 
  parseObject, 
  renderTemplate,
  buildPaperclipEnv
} from "@paperclipai/adapter-utils/server-utils";
import type { 
  AdapterExecutionContext, 
  AdapterExecutionResult 
} from "@paperclipai/adapter-utils";
import { DEFAULT_OLLAMA_MODEL } from "../index.js";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, agent, context, onLog, onMeta } = ctx;
  
  const endpointUrl = asString(config.endpointUrl, "http://localhost:11434").replace(/\/$/, "");
  const model = asString(config.model, DEFAULT_OLLAMA_MODEL);
  const promptTemplate = asString(
    config.promptTemplate, 
    "You are {{agent.name}}, a Paperclip agent (role: {{agent.role}}). Your task is to help with the Paperclip control plane. Continue your work."
  );
  const systemPrompt = asString(config.system, "You are a helpful AI assistant working as a Paperclip agent.");
  const options = parseObject(config.options);

  const prompt = renderTemplate(promptTemplate, {
    agent,
    context,
    run: { id: ctx.runId }
  });

  const env = buildPaperclipEnv(agent);
  
  if (onMeta) {
    await onMeta({
      adapterType: "ollama_local",
      command: "HTTP POST /api/chat",
      commandArgs: [endpointUrl],
      env,
    });
  }

  try {
    const response = await fetch(`${endpointUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: true,
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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    let fullText = "";
    let usage: any = {};
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            const content = json.message.content;
            fullText += content;
            await onLog("stdout", content);
          }
          if (json.done) {
            usage = {
              inputTokens: json.prompt_eval_count ?? 0,
              outputTokens: json.eval_count ?? 0,
            };
          }
        } catch (e) {
          await onLog("stderr", `Failed to parse Ollama line: ${line}\n`);
        }
      }
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: fullText,
      usage,
      provider: "ollama",
      model,
    };
  } catch (err) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
