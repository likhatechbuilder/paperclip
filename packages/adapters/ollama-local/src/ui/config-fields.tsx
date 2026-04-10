import * as React from "react";
import { Field, DraftInput, DraftNumberInput, help } from "@paperclipai/ui/components/agent-config-primitives";
import { AdapterConfigFieldsProps, CreateConfigValues } from "@paperclipai/adapter-utils";

export function ConfigFields(props: AdapterConfigFieldsProps) {
  const { values, set, config, eff, mark } = props;
  const isEdit = !!config;

  const valCwd = isEdit ? eff?.cwd : values?.cwd;
  const valInstructions = isEdit ? eff?.instructionsFilePath : values?.instructionsFilePath;
  const valTimeout = isEdit ? eff?.timeoutSec : values?.timeoutSec;
  const valUrl = isEdit ? eff?.url : values?.url;
  const valNumCtx = isEdit ? eff?.num_ctx : values?.num_ctx;

  const setVal = (key: string, val: any) => {
    if (isEdit) {
      if (mark) mark(key, val);
    } else {
      if (set) set({ ...values, [key]: val } as CreateConfigValues);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Working Directory" hint={help.cwd}>
        <DraftInput
          value={(valCwd as string) ?? ""}
          onCommit={(val: string) => setVal("cwd", val)}
          placeholder="/path/to/workspace"
        />
      </Field>
      <Field label="Instructions File" hint={help.instructionsFilePath}>
        <DraftInput
          value={(valInstructions as string) ?? ""}
          onCommit={(val: string) => setVal("instructionsFilePath", val)}
          placeholder="/path/to/instructions.md"
        />
      </Field>
      <Field label="Ollama URL" hint="URL to Ollama endpoint (default: http://127.0.0.1:11434)">
        <DraftInput
          value={(valUrl as string) ?? ""}
          onCommit={(val: string) => setVal("url", val)}
          placeholder="http://127.0.0.1:11434"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Context Size (num_ctx)" hint="Maximum context tokens (default: 32768)">
          <DraftNumberInput
            value={(valNumCtx as number) ?? 32768}
            onCommit={(val: number | null) => setVal("num_ctx", val)}
            placeholder="32768"
          />
        </Field>
        <Field label="Timeout (sec)" hint={help.timeoutSec}>
          <DraftNumberInput
            value={(valTimeout as number) ?? 0}
            onCommit={(val: number | null) => setVal("timeoutSec", val)}
            placeholder="0"
          />
        </Field>
      </div>
    </div>
  );
}

export function buildAdapterConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.cwd) ac.cwd = v.cwd;
  if (v.instructionsFilePath) ac.instructionsFilePath = v.instructionsFilePath;
  if (v.model) ac.model = v.model;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  // @ts-ignore
  if (v.num_ctx) ac.num_ctx = Number(v.num_ctx);
  // @ts-ignore
  if (v.url) ac.url = v.url;
  ac.timeoutSec = Number(v.timeoutSec) || 0;
  return ac;
}
