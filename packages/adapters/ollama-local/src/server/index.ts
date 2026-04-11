import { AdapterSessionCodec, AdapterModel } from "@paperclipai/adapter-utils";
export { execute } from "./execute.js";
export { testEnvironment } from "./test.js";

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (!raw || typeof raw !== "object") return null;
    return raw as Record<string, unknown>;
  },
  serialize(params: Record<string, unknown> | null) {
    return params || null;
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params || !Array.isArray(params.messages)) return null;
    return `ollama-session-${params.messages.length}-msgs`;
  },
};

export async function listModels(): Promise<AdapterModel[]> {
  try {
    const url = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) return [];
    
    const data = await res.json() as { models?: { name: string }[] };
    if (!data.models || !Array.isArray(data.models)) return [];
    
    return data.models.map(m => ({
      id: m.name,
      label: `(Local) ${m.name}`
    }));
  } catch (err) {
    // Fails silently if ollama is not running
    return [];
  }
}
