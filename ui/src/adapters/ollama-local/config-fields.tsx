import { useState } from "react";
import type { AdapterConfigFieldsProps } from "../types";
import {
  DraftInput,
  Field,
  help,
} from "../../components/agent-config-primitives";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function OllamaLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  const currentModel = isCreate
    ? values!.model ?? "llama3"
    : String(config.model ?? "llama3");

  const filteredModels = models.filter((m) => {
    if (!modelSearch.trim()) return true;
    const q = modelSearch.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)
    );
  });

  const manualModel = modelSearch.trim();
  const canCreateManual = Boolean(
    manualModel &&
    !models.some((m) => m.id.toLowerCase() === manualModel.toLowerCase()),
  );

  return (
    <>
      <Field label="Ollama endpoint" hint="Host and port where Ollama is running. Default: http://localhost:11434">
        <DraftInput
          value={
            isCreate
              ? values!.endpointUrl ?? "http://localhost:11434"
              : eff("adapterConfig", "endpointUrl", String(config.endpointUrl ?? "http://localhost:11434"))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ endpointUrl: v })
              : mark("adapterConfig", "endpointUrl", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="http://localhost:11434"
        />
      </Field>

      {/* ---- Model picker ---- */}
      <Field label="Model" hint="Select a model from your local Ollama instance, or type a custom name. Make sure it's pulled (ollama pull <model>).">
        <Popover
          open={modelOpen}
          onOpenChange={(next) => {
            setModelOpen(next);
            if (!next) setModelSearch("");
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-accent/50 transition-colors w-full justify-between"
            >
              <span className={cn(!currentModel && "text-muted-foreground")}>
                {models.find((m) => m.id === currentModel)?.label ?? (currentModel || "Select model")}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
            <div className="relative mb-1">
              <input
                className="w-full px-2 py-1.5 pr-6 text-xs bg-transparent outline-none border-b border-border placeholder:text-muted-foreground/50"
                placeholder="Search or type any model name..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {/* Show current value if it's a custom model not in list */}
              {currentModel && !models.some((m) => m.id === currentModel) && (
                <button
                  type="button"
                  className="flex items-center w-full px-2 py-1.5 text-sm rounded bg-accent/50"
                  onClick={() => setModelOpen(false)}
                >
                  <span className="block w-full text-left truncate font-mono text-xs">{currentModel}</span>
                  <span className="shrink-0 ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                    current
                  </span>
                </button>
              )}

              {/* Type-to-create entry for any custom model name */}
              {canCreateManual && (
                <button
                  type="button"
                  className="flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50"
                  onClick={() => {
                    if (isCreate) {
                      set!({ model: manualModel });
                    } else {
                      mark("adapterConfig", "model", manualModel);
                    }
                    setModelOpen(false);
                    setModelSearch("");
                  }}
                >
                  <span>Use custom model</span>
                  <span className="text-xs font-mono text-muted-foreground">{manualModel}</span>
                </button>
              )}

              {/* Model list */}
              {filteredModels.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={cn(
                    "flex items-center w-full px-2 py-1.5 text-sm rounded hover:bg-accent/50",
                    m.id === currentModel && "bg-accent",
                  )}
                  onClick={() => {
                    if (isCreate) {
                      set!({ model: m.id });
                    } else {
                      mark("adapterConfig", "model", m.id);
                    }
                    setModelOpen(false);
                  }}
                >
                  <span className="block w-full text-left truncate" title={m.id}>
                    {m.label}
                  </span>
                </button>
              ))}

              {filteredModels.length === 0 && !canCreateManual && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No models found. Start Ollama and pull a model first.
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </Field>

      <Field label="System prompt" hint="System instructions that define the agent's identity and boundaries. Overrides the model's default system prompt.">
        <textarea
          value={
            isCreate
              ? values!.system ?? ""
              : eff("adapterConfig", "system", String(config.system ?? ""))
          }
          onChange={(e) =>
            isCreate
              ? set!({ system: e.target.value })
              : mark("adapterConfig", "system", e.target.value || undefined)
          }
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="You are a helpful AI assistant working as a Paperclip agent."
        />
      </Field>

      <Field label="Prompt template" hint={help.promptTemplate}>
        <textarea
          value={
            isCreate
              ? values!.promptTemplate ?? ""
              : eff("adapterConfig", "promptTemplate", String(config.promptTemplate ?? ""))
          }
          onChange={(e) =>
            isCreate
              ? set!({ promptTemplate: e.target.value })
              : mark("adapterConfig", "promptTemplate", e.target.value || undefined)
          }
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="You are {{agent.name}}, a Paperclip agent..."
        />
      </Field>
    </>
  );
}
