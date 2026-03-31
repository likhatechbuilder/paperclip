import type { TranscriptEntry } from "@paperclipai/adapter-utils";

export function parseOllamaStdoutLine(line: string, ts: string): TranscriptEntry[] {
  // If the server sends raw text chunks, treat as assistant.
  // In a more complex adapter, the server might send JSONL with "assistant" tags.
  // For Ollama simple stream, we just treat all stdout as the assistant's response.
  return [{ kind: "assistant" as const, ts, text: line }];
}
