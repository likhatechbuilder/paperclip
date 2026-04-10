import { AdapterSessionCodec } from "@paperclipai/adapter-utils";
export { execute } from "./execute";
export { testEnvironment } from "./test";

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
