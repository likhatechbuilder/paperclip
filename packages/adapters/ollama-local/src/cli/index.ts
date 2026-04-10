import pc from "picocolors";

export function formatStdoutEvent(line: string, debug: boolean): void {
  try {
    const entry = JSON.parse(line);
    if (entry.kind === "assistant") {
      process.stdout.write(pc.green(entry.text));
    } else if (entry.kind === "tool_call") {
      console.log(pc.yellow(`\n[Tool Call] ${entry.name} ${JSON.stringify(entry.input)}`));
    } else if (entry.kind === "tool_result") {
      console.log(pc.dim(`[Tool Result `) + (entry.isError ? pc.red("Error") : pc.green("Success")) + pc.dim(`]`));
    } else if (entry.kind === "result") {
      console.log(pc.blue(`\n[Run Complete] ${entry.text || ""}`));
    } else if (debug) {
      console.log(pc.gray(line));
    }
  } catch (err) {
    if (debug) console.log(pc.gray(line));
  }
}
