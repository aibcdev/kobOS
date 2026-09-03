"use client";

import { useMemo, useState } from "react";
import {
  HEARD_FROM_OPTIONS,
  isAiHeardFrom,
  type HeardFromPayload,
} from "@/lib/marketing/heard-from";

export function HeardFromFields({
  value,
  onChange,
  selectClass,
}: {
  value: HeardFromPayload;
  onChange: (next: HeardFromPayload) => void;
  selectClass: string;
}) {
  const showPrompt = useMemo(() => isAiHeardFrom(value.heardFrom), [value.heardFrom]);
  const [prompt, setPrompt] = useState(value.aiPrompt ?? "");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#2c2c2c]">
        How did you hear about KOB? <span className="font-normal text-[#2c2c2c]/50">(optional)</span>
        <select
          value={value.heardFrom ?? ""}
          onChange={(e) => onChange({ ...value, heardFrom: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">Select…</option>
          {HEARD_FROM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {showPrompt ? (
        <label className="block text-sm font-medium text-[#2c2c2c]">
          What did you type into the AI? <span className="font-normal text-[#2c2c2c]/50">(optional)</span>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              onChange({ ...value, aiPrompt: e.target.value.trim() || undefined });
            }}
            rows={3}
            placeholder="Paste the prompt if you remember it"
            className={selectClass}
          />
        </label>
      ) : null}
    </div>
  );
}
