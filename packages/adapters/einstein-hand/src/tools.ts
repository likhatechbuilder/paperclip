import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Tool definitions (sent to Ollama in the tools array)
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      required: string[];
      properties: Record<string, { type: string; description: string }>;
    };
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the contents of a file from disk. The path is relative to the current working directory. Use this to inspect source code, README files, configuration, etc.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description: "Relative or absolute path to the file to read",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write content to a file on disk. Creates the file if it doesn't exist. Creates parent directories if needed. The path is relative to the current working directory.",
      parameters: {
        type: "object",
        required: ["path", "content"],
        properties: {
          path: {
            type: "string",
            description: "Relative or absolute path to write to",
          },
          content: {
            type: "string",
            description: "The full content to write to the file",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description:
        "List files and subdirectories in a directory. Returns names, types (file/directory), and sizes. The path is relative to the current working directory.",
      parameters: {
        type: "object",
        required: ["path"],
        properties: {
          path: {
            type: "string",
            description:
              "Relative or absolute path to the directory to list. Use '.' for the current directory.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Execute a shell command in the working directory. Use for git operations, npm install, running scripts, etc. The command runs synchronously with a 30-second timeout.",
      parameters: {
        type: "object",
        required: ["command"],
        properties: {
          command: {
            type: "string",
            description:
              "The shell command to execute (e.g., 'git clone https://...', 'npm install', 'node script.js')",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_url",
      description:
        "Fetch the text content of a URL via HTTP GET. Use this to read README files from GitHub, API documentation, or other web resources. Returns the raw text body.",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            description: "The URL to fetch (e.g., 'https://raw.githubusercontent.com/user/repo/main/README.md')",
          },
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution handlers
// ---------------------------------------------------------------------------

const DEFAULT_COMMAND_WHITELIST = [
  "git", "npm", "npx", "node", "pnpm", "yarn",
  "mkdir", "rmdir", "ls", "dir", "cat", "type",
  "echo", "curl", "wget", "cp", "copy", "mv",
  "move", "touch", "find", "grep", "head", "tail",
  "python", "python3", "pip",
];

function resolvePath(cwd: string, filePath: string): string {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath);
  // Basic sandbox: ensure the resolved path is within or below cwd
  const normalizedCwd = path.resolve(cwd);
  const normalizedResolved = path.resolve(resolved);
  if (!normalizedResolved.startsWith(normalizedCwd)) {
    throw new Error(
      `Path "${filePath}" resolves outside the workspace. Resolved: "${normalizedResolved}", Workspace: "${normalizedCwd}"`
    );
  }
  return normalizedResolved;
}

export interface ToolCallArgs {
  [key: string]: string | undefined;
}

export interface ToolExecOptions {
  cwd: string;
  commandWhitelist?: string[];
}

export async function executeTool(
  name: string,
  args: ToolCallArgs,
  opts: ToolExecOptions
): Promise<string> {
  switch (name) {
    case "read_file":
      return executeReadFile(args, opts);
    case "write_file":
      return executeWriteFile(args, opts);
    case "list_directory":
      return executeListDirectory(args, opts);
    case "run_command":
      return executeRunCommand(args, opts);
    case "read_url":
      return executeReadUrl(args);
    default:
      return `Error: Unknown tool "${name}"`;
  }
}

async function executeReadFile(args: ToolCallArgs, opts: ToolExecOptions): Promise<string> {
  const filePath = args.path;
  if (!filePath) return "Error: 'path' argument is required";

  try {
    const resolved = resolvePath(opts.cwd, filePath);
    const content = await fs.readFile(resolved, "utf-8");
    // Cap at 8KB to prevent memory overflow in context
    if (content.length > 8192) {
      return content.substring(0, 8192) + `\n\n... [truncated at 8KB, file is ${content.length} bytes total]`;
    }
    return content;
  } catch (err) {
    return `Error reading file "${filePath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeWriteFile(args: ToolCallArgs, opts: ToolExecOptions): Promise<string> {
  const filePath = args.path;
  const content = args.content;
  if (!filePath) return "Error: 'path' argument is required";
  if (content === undefined) return "Error: 'content' argument is required";

  try {
    const resolved = resolvePath(opts.cwd, filePath);
    // Create parent directories
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
    return `Successfully wrote ${content.length} bytes to "${filePath}"`;
  } catch (err) {
    return `Error writing file "${filePath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeListDirectory(args: ToolCallArgs, opts: ToolExecOptions): Promise<string> {
  const dirPath = args.path || ".";

  try {
    const resolved = resolvePath(opts.cwd, dirPath);
    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const lines: string[] = [];
    for (const entry of entries) {
      const type = entry.isDirectory() ? "[DIR]" : "[FILE]";
      try {
        const stat = await fs.stat(path.join(resolved, entry.name));
        const size = entry.isDirectory() ? "" : ` (${stat.size} bytes)`;
        lines.push(`${type} ${entry.name}${size}`);
      } catch {
        lines.push(`${type} ${entry.name}`);
      }
    }
    return lines.length > 0 ? lines.join("\n") : "(empty directory)";
  } catch (err) {
    return `Error listing directory "${dirPath}": ${err instanceof Error ? err.message : String(err)}`;
  }
}

function executeRunCommand(args: ToolCallArgs, opts: ToolExecOptions): string {
  const command = args.command;
  if (!command) return "Error: 'command' argument is required";

  // Extract the base command for whitelist checking
  const baseCmd = command.trim().split(/[\s/\\]+/)[0]?.toLowerCase() ?? "";
  const whitelist = opts.commandWhitelist ?? DEFAULT_COMMAND_WHITELIST;
  if (!whitelist.some((allowed) => baseCmd === allowed.toLowerCase() || baseCmd.endsWith(`.exe`) && baseCmd.replace(/\.exe$/i, "") === allowed.toLowerCase())) {
    return `Error: Command "${baseCmd}" is not in the allowed whitelist. Allowed: ${whitelist.join(", ")}`;
  }

  try {
    const output = execSync(command, {
      cwd: opts.cwd,
      timeout: 30_000,     // 30s timeout
      maxBuffer: 1024 * 512, // 512KB output cap
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const trimmed = (output ?? "").trim();
    if (trimmed.length > 4096) {
      return trimmed.substring(0, 4096) + "\n... [output truncated at 4KB]";
    }
    return trimmed || "(command completed with no output)";
  } catch (err: unknown) {
    const execError = err as { status?: number; stdout?: string; stderr?: string; message?: string };
    const stderr = execError.stderr?.trim() ?? "";
    const stdout = execError.stdout?.trim() ?? "";
    return `Command failed (exit code ${execError.status ?? "unknown"}):\nSTDOUT: ${stdout.substring(0, 1024)}\nSTDERR: ${stderr.substring(0, 1024)}`;
  }
}

async function executeReadUrl(args: ToolCallArgs): Promise<string> {
  const url = args.url;
  if (!url) return "Error: 'url' argument is required";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PaperclipAI-EinsteinHand/1.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return `HTTP error ${response.status}: ${response.statusText}`;
    }

    const text = await response.text();
    if (text.length > 8192) {
      return text.substring(0, 8192) + `\n\n... [truncated at 8KB, response was ${text.length} bytes]`;
    }
    return text;
  } catch (err) {
    return `Error fetching URL "${url}": ${err instanceof Error ? err.message : String(err)}`;
  }
}
