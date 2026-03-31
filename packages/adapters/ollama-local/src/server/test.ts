import { asString } from "@paperclipai/adapter-utils/server-utils";
import type { 
  AdapterEnvironmentTestContext, 
  AdapterEnvironmentTestResult,
  AdapterEnvironmentCheck
} from "@paperclipai/adapter-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const { config } = ctx;
  const endpointUrl = asString(config.endpointUrl, "http://localhost:11434").replace(/\/$/, "");
  const model = asString(config.model, "");

  const checks: AdapterEnvironmentCheck[] = [];

  try {
    const response = await fetch(`${endpointUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      const modelNames = models.map((m: any) => m.name);
      
      checks.push({
        code: "OLLAMA_ACCESSIBLE",
        level: "info",
        message: `Ollama is running at ${endpointUrl}`,
        detail: `Found ${models.length} models: ${modelNames.join(", ")}`,
      });

      if (model && !modelNames.includes(model)) {
        checks.push({
          code: "OLLAMA_MODEL_MISSING",
          level: "warn",
          message: `Model "${model}" not found in your local Ollama library.`,
          hint: `Run "ollama pull ${model}" to download it.`,
        });
      } else if (model) {
        checks.push({
          code: "OLLAMA_MODEL_FOUND",
          level: "info",
          message: `Model "${model}" is ready to use.`,
        });
      }
    } else {
      checks.push({
        code: "OLLAMA_API_ERROR",
        level: "error",
        message: `Ollama API responded with error ${response.status}`,
      });
    }
  } catch (err) {
    checks.push({
      code: "OLLAMA_UNREACHABLE",
      level: "error",
      message: `Failed to connect to Ollama at ${endpointUrl}`,
      hint: "Make sure the Ollama application is running and accessible.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  const status = checks.some((c) => c.level === "error") ? "fail" : 
                 checks.some((c) => c.level === "warn") ? "warn" : "pass";

  return {
    adapterType: "ollama_local",
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}
