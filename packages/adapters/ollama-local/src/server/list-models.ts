import type { AdapterModel } from "@paperclipai/adapter-utils";

/**
 * Dynamically fetches the list of locally available Ollama models
 * by querying GET /api/tags on the Ollama server.
 *
 * Falls back to the hardcoded model list if Ollama is unreachable.
 */
export async function listModels(): Promise<AdapterModel[]> {
  const endpoint = "http://localhost:11434";
  try {
    const res = await fetch(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Ollama /api/tags returned ${res.status}`);
    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        model?: string;
        size?: number;
        modified_at?: string;
        details?: {
          parameter_size?: string;
          family?: string;
          format?: string;
        };
      }>;
    };
    if (!data.models || data.models.length === 0) {
      return [{ id: "__none__", label: "No models found — run: ollama pull <model>" }];
    }
    return data.models.map((m) => {
      const name = m.name;
      const paramSize = m.details?.parameter_size ?? "";
      const family = m.details?.family ?? "";
      const parts = [name];
      if (paramSize) parts.push(paramSize);
      if (family && !name.toLowerCase().includes(family.toLowerCase())) parts.push(family);
      return {
        id: name,
        label: parts.join(" · "),
      };
    });
  } catch {
    // Ollama not running or unreachable — return helpful placeholder
    return [
      { id: "llama3", label: "llama3 (offline — start Ollama to see live models)" },
      { id: "mistral", label: "mistral" },
      { id: "codellama", label: "codellama" },
      { id: "gemma", label: "gemma" },
      { id: "deepseek-coder", label: "deepseek-coder" },
      { id: "qwen", label: "qwen" },
    ];
  }
}
