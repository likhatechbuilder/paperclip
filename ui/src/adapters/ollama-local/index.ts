import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildAdapterConfig } from "@paperclipai/adapter-ollama-local/ui";
import { ConfigFields } from "./config-fields";

export const ollamaLocalUIAdapter: UIAdapterModule = {
  type: "ollama_local",
  label: "Ollama (local)",
  parseStdoutLine,
  ConfigFields,
  buildAdapterConfig,
};
