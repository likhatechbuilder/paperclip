import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterModel,
} from "@paperclipai/adapter-utils";
import { execute as executeImpl } from "./execute.js";
import { asString } from "@paperclipai/adapter-utils/server-utils";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  return executeImpl(ctx);
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const endpointUrl = asString(ctx.config.endpointUrl, "http://localhost:11434").replace(/\/$/, "");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch(`${endpointUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        adapterType: "einstein_hand",
        status: "fail",
        checks: [
          {
            code: "ollama_unreachable",
            level: "error",
            message: `Ollama returned HTTP ${response.status}`,
            hint: "Ensure Ollama is running: ollama serve",
          },
        ],
        testedAt: new Date().toISOString(),
      };
    }

    return {
      adapterType: "einstein_hand",
      status: "pass",
      checks: [
        {
          code: "ollama_ok",
          level: "info",
          message: `Ollama is reachable at ${endpointUrl}`,
        },
      ],
      testedAt: new Date().toISOString(),
    };
  } catch {
    return {
      adapterType: "einstein_hand",
      status: "fail",
      checks: [
        {
          code: "ollama_unreachable",
          level: "error",
          message: `Cannot reach Ollama at ${endpointUrl}`,
          hint: "Start Ollama with: ollama serve",
        },
      ],
      testedAt: new Date().toISOString(),
    };
  }
}

export async function listModels(): Promise<AdapterModel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const response = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];
    const data = (await response.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).map((m) => ({
      id: m.name,
      label: m.name,
    }));
  } catch {
    return [];
  }
}
