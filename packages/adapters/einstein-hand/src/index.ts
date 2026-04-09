export const type = "einstein_hand";
export const label = "Einstein Hand (Ollama + Tools)";

export const DEFAULT_EINSTEIN_MODEL = "llama3.1";

export const models = [
  { id: "llama3.1", label: "Llama 3.1 (8B — recommended)" },
  { id: "llama3.2", label: "Llama 3.2 (3B — faster)" },
  { id: "llama3", label: "Llama 3 (8B — limited tool support)" },
  { id: "qwen3-coder:480b-cloud", label: "Qwen3 Coder 480B (cloud)" },
  { id: "mistral", label: "Mistral" },
  { id: "deepseek-coder", label: "DeepSeek Coder" },
];

export const agentConfigurationDoc = `# einstein_hand agent configuration

Adapter: einstein_hand

The Einstein Hand gives Ollama agents real "hands" — filesystem access,
terminal commands, and web fetching — using Ollama's native tool-calling API.
The agent loop runs inside Paperclip itself: no external CLI required.

Use when:
- You want agents that can READ and WRITE files on disk
- You want to use local Ollama models (no API costs)
- You need agents to clone repos, run npm install, create files

Don't use when:
- You need deep multi-file refactoring (use claude_local or opencode_local)
- Your Ollama model doesn't support tool calling (llama3.1+ recommended)

Core fields:
- endpointUrl (string, optional): Ollama API endpoint, defaults to "http://localhost:11434"
- model (string, required): Ollama model name (e.g., "llama3.1")
- cwd (string, optional): working directory for file operations and commands
- maxTurns (number, optional): max tool-call turns per run (default: 15)
- commandWhitelist (string[], optional): allowed terminal commands (default: git, npm, npx, node, pnpm, mkdir, ls, dir, cat, type, echo, curl)
- promptTemplate (string, optional): custom instruction template
- system (string, optional): system prompt override
- options (object, optional): Ollama generation options (temperature, etc.)
- env (object, optional): additional environment variables
`;
