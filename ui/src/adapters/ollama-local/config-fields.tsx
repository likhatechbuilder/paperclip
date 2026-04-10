import * as React from "react";
import { Field, DraftInput, DraftNumberInput } from "../../components/agent-config-primitives";
import type { AdapterConfigFieldsProps } from "../types";

const help = {
  cwd: "Working directory for the agent process.",
  instructionsFilePath: "Absolute path to a markdown instructions file.",
  timeoutSec: "Timeout for agent runs.",
};

export function ConfigFields(props: AdapterConfigFieldsProps) {
  const { values, set, config, eff, mark } = props;
  const isEdit = !!config;

  const valCwd = isEdit ? eff("adapterConfig", "cwd", "") : values?.cwd;
  const valInstructions = isEdit ? eff("adapterConfig", "instructionsFilePath", "") : values?.instructionsFilePath;
  const valTimeout = isEdit ? eff("adapterConfig", "timeoutSec", 0) : (values as any)?.timeoutSec;
  const valUrl = isEdit ? eff("adapterConfig", "url", "") : (values as any)?.url;
  const valNumCtx = isEdit ? eff("adapterConfig", "num_ctx", 32768) : (values as any)?.num_ctx;

  const setVal = (key: string, val: any) => {
    if (isEdit) {
      if (mark) mark("adapterConfig", key, val);
    } else {
      if (set) {
        const payload: any = { ...values };
        payload[key] = val;
        set(payload);
      }
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
      {!props.hideInstructionsFile && (
        <Field label="Instructions File" hint={help.instructionsFilePath}>
          <DraftInput
            value={(valInstructions as string) ?? ""}
            onCommit={(val: string) => setVal("instructionsFilePath", val)}
            placeholder="/path/to/instructions.md"
          />
        </Field>
      )}
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
