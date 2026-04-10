import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_OLLAMA_MODEL } from "../index.js";

export function buildOllamaConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  ac.endpointUrl = v.endpointUrl || "http://localhost:11434";
  ac.model = v.model || DEFAULT_OLLAMA_MODEL;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.system) ac.system = v.system;
  if (v.options) {
     try {
       ac.options = JSON.parse(v.options as string);
     } catch {
       ac.options = {};
     }
  }
  return ac;
}
