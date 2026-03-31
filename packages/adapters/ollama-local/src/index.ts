export const type = "ollama_local";
export const label = "Ollama (local)";

export const DEFAULT_OLLAMA_MODEL = "llama3";

export const models = [
  { id: "llama3", label: "Llama 3" },
  { id: "llama3:70b", label: "Llama 3 (70B)" },
  { id: "mistral", label: "Mistral" },
  { id: "gemma", label: "Gemma" },
  { id: "codellama", label: "Code Llama" },
  { id: "deepseek-coder", label: "DeepSeek Coder" },
  { id: "qwen", label: "Qwen" },
];

export const agentConfigurationDoc = `# ollama_local agent configuration

Adapter: ollama_local

Use when:
- You want to run open-weights models locally via Ollama (offline)
- You have Ollama installed and running on the host machine
- You want to avoid third-party API costs or data sharing

Don't use when:
- You need the reasoning depth of Claude 3.5 Sonnet or GPT-4o (use the cloud adapters)
- The host machine has limited RAM/GPU (Ollama runs models locally)
- You need persistent thread resumption (Ollama is currently implemented as one-shot per heartbeat)

Core fields:
- endpointUrl (string, optional): defaults to "http://localhost:11434"
- model (string, required): the Ollama model name (e.g., "llama3", "codellama")
- promptTemplate (string, optional): custom instruction template
- options (object, optional): Ollama generation options (temperature, top_p, etc.)
- system (string, optional): system prompt override
- env (object, optional): additional environment variables
`;
