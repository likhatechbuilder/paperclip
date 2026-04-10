import pc from "picocolors";

export function printOllamaStreamEvent(raw: string, debug: boolean): void {
  // If the server sends raw text, print as assistant.
  // In a more complex adapter, we might distinguish tags.
  process.stdout.write(pc.green(raw));
}
