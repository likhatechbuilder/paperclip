import { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@paperclipai/adapter-utils";
import { asString } from "@paperclipai/adapter-utils/server-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const { config, adapterType } = ctx;
  const url = asString(config.url, "http://127.0.0.1:11434");
  const model = asString(config.model, "gemma:7b");

  const result: AdapterEnvironmentTestResult = {
    adapterType,
    status: "pass",
    checks: [],
    testedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(`${url}/api/tags`);
    if (!res.ok) {
      result.checks.push({
        code: "ollama_connection_failed",
        level: "error",
        message: `Failed to connect to Ollama at ${url}. Status: ${res.status}`,
      });
    } else {
      const data = await res.json();
      const models = data.models || [];
      const isModelAvailable = models.some((m: any) => m.name === model || m.name === `${model}:latest`);
      
      result.checks.push({
        code: "ollama_connection_success",
        level: "info",
        message: `Successfully connected to Ollama REST API at ${url}.`,
      });

      if (!isModelAvailable) {
        result.checks.push({
          code: "ollama_model_missing",
          level: "warn",
          message: `Model '${model}' not found in Ollama local registry.`,
          hint: `Run 'ollama pull ${model}' in your terminal.`,
        });
      } else {
        result.checks.push({
          code: "ollama_model_found",
          level: "info",
          message: `Model '${model}' is installed.`,
        });
      }
    }
  } catch (err: any) {
    result.checks.push({
      code: "ollama_connection_error",
      level: "error",
      message: `Could not reach Ollama API at ${url}: ${err.message}`,
      hint: "Make sure the Ollama application is running and accessible.",
    });
  }

  const hasErrors = result.checks.some((c) => c.level === "error");
  const hasWarns = result.checks.some((c) => c.level === "warn");

  if (hasErrors) {
    result.status = "fail";
  } else if (hasWarns) {
    result.status = "warn";
  }

  return result;
}
