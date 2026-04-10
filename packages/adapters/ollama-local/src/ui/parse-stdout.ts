export function parseStdoutLine(line: string, ts: string): any[] {
  try {
    const parsed = JSON.parse(line);
    if (parsed.kind) {
      return [{ ...parsed, ts }];
    }
    return [{ kind: "stdout", text: line, ts }];
  } catch (err) {
    return [{ kind: "stdout", text: line, ts }];
  }
}
