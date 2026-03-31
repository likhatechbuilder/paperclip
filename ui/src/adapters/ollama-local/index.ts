import type { UIAdapterModule } from "../types";
import { type, label, buildOllamaConfig, parseOllamaStdoutLine } from "@paperclipai/adapter-ollama-local/ui";
import { OllamaLocalConfigFields } from "./config-fields";

export const ollamaUIAdapter: UIAdapterModule = {
  type,
  label,
  parseStdoutLine: parseOllamaStdoutLine,
  ConfigFields: OllamaLocalConfigFields,
  buildAdapterConfig: buildOllamaConfig,
};
