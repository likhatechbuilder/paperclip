export const type = "ollama_local";
export const label = "Ollama (local)";

export const DEFAULT_OLLAMA_MODEL = "gemma:7b";

export const models = [
  { id: "gemma:latest", label: "Gemma" },
  { id: "gemma:2b", label: "Gemma 2B" },
  { id: "gemma:7b", label: "Gemma 7B" },
  { id: "llama3:latest", label: "Llama 3" },
  { id: "llama3:8b", label: "Llama 3 8B" },
  { id: "qwen2.5:7b", label: "Qwen 2.5 7B" },
];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- You want Paperclip to run autonomously against a local Ollama instance's REST API.
- You need deep tool-calling abilities using Ollama's native tool support.
- The user requires massive context windows (32K - 100K).

Don't use when:
- You need webhook-style external invocation (use http or openclaw_gateway)
- You only need a one-shot script (use process)
- You require proprietary models (use claude_local, opencode_local, or gemini_local)

Core fields:
- cwd (string, optional): working directory fallback for the agent process
- instructionsFilePath (string, optional): path to markdown instructions prepended to prompt
- promptTemplate (string, optional): run prompt template
- model (string, required): Ollama model id (e.g. gemma:7b, llama3). Defaults to gemma:7b.
- timeoutSec (number, optional): run timeout in seconds
- graceSec (number, optional): SIGTERM grace period
- num_ctx (number, optional): Context size. Defaults to 32768.
- temperature (number, optional): Model temperature. Defaults to 0.7.
- url (string, optional): URL to Ollama endpoint. Defaults to http://127.0.0.1:11434.

Notes:
- Runs use the Ollama /api/chat endpoint directly from the Paperclip server.
- The adapter translates Paperclip Skills into Ollama Tool schema.
- High \`num_ctx\` consumes significantly more VRAM. Ensure hardware capacity.
`;
