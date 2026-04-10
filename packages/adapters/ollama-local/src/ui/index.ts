export { parseStdoutLine } from "./parse-stdout";

export function buildAdapterConfig(v: any): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.model) ac.model = v.model;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.num_ctx) ac.num_ctx = Number(v.num_ctx);
  if (v.url) ac.url = v.url;
  ac.timeoutSec = Number(v.timeoutSec) || 0;
  return ac;
}
