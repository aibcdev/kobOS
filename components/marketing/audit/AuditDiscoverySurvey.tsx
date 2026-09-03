"use client";

import { useMemo, useState } from "react";
import {
  AUDIT_DISCOVERY_QUESTIONS,
  discoveryAnsweredCount,
  isDiscoveryComplete,
  type AuditDiscoveryAnswers,
  type AuditDiscoveryQuestion,
} from "@/lib/marketing/audit-discovery";

const TOTAL = AUDIT_DISCOVERY_QUESTIONS.length;

function Pill({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm transition-colors ${
        selected
          ? "border-[#094413] bg-[#094413] text-white"
          : "border-[#2c2c2c]/15 bg-white text-[#2c2c2c] hover:border-[#088924]/40"
      }`}
    >
      {selected ? (
        <span className="text-xs" aria-hidden>
          ✓
        </span>
      ) : null}
      {label}
    </button>
  );
}

function QuestionBlock({
  index,
  question,
  answers,
  onSingle,
  onToggleMulti,
}: {
  index: number;
  question: AuditDiscoveryQuestion;
  answers: Partial<AuditDiscoveryAnswers>;
  onSingle: (id: keyof AuditDiscoveryAnswers, value: string) => void;
  onToggleMulti: (id: "biggestLeaks" | "systems", value: string, max: number) => void;
}) {
  const selectedSingle =
    !question.multi && typeof answers[question.id] === "string" ? (answers[question.id] as string) : "";
  const selectedMulti = question.multi
    ? ((answers[question.id] as string[] | undefined) ?? [])
    : [];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#2c2c2c]">
        <span className="font-mono-brand mr-2 text-xs font-semibold uppercase tracking-wider text-[#088924]">
          {String(index + 1).padStart(2, "0")}
        </span>
        {question.prompt}
        {question.multi ? (
          <span className="ml-1 text-xs font-normal text-[#2c2c2c]/50">
            (pick up to {question.max ?? 3})
          </span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {question.choices.map((c) => {
          const selected = question.multi ? selectedMulti.includes(c.value) : selectedSingle === c.value;
          return (
            <Pill
              key={c.value}
              selected={selected}
              label={c.label}
              onClick={() => {
                if (question.multi) {
                  onToggleMulti(question.id, c.value, question.max ?? 3);
                } else {
                  onSingle(question.id, c.value);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AuditDiscoverySurvey({
  venueLabel,
  loading,
  onBack,
  onContinue,
}: {
  venueLabel?: string | null;
  loading?: boolean;
  onBack: () => void;
  onContinue: (answers: AuditDiscoveryAnswers) => void;
}) {
  const [answers, setAnswers] = useState<Partial<AuditDiscoveryAnswers>>({});
  const filled = discoveryAnsweredCount(answers);
  const pct = Math.round((filled / TOTAL) * 100);
  const complete = useMemo(() => isDiscoveryComplete(answers), [answers]);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-[#2c2c2c]/10 bg-white p-6 shadow-[0_20px_50px_-16px_rgba(9,68,19,0.12)] md:p-8">
      <p className="font-mono-brand text-xs font-semibold uppercase tracking-widest text-[#088924]">
        Discovery · 8 quick taps
      </p>
      <h2 className="font-heading mt-2 text-xl font-semibold tracking-tight text-[#2c2c2c] md:text-2xl">
        Tell us what’s hurting — then we scan
      </h2>
      {venueLabel ? (
        <p className="mt-2 text-sm text-[#2c2c2c]/65">
          For <span className="font-medium text-[#2c2c2c]">{venueLabel}</span>
        </p>
      ) : null}
      <p className="mt-1 text-sm text-[#2c2c2c]/60">
        Covers, online presence, orders — so the report focuses on your real problems.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-medium text-[#2c2c2c]/55">
          <span>
            {String(filled).padStart(2, "0")} of {String(TOTAL).padStart(2, "0")} filled
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#2c2c2c]/08">
          <div
            className="h-full rounded-full bg-[#088924] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {AUDIT_DISCOVERY_QUESTIONS.map((q, i) => (
          <QuestionBlock
            key={q.id}
            index={i}
            question={q}
            answers={answers}
            onSingle={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
            onToggleMulti={(id, value, max) => {
              setAnswers((prev) => {
                const cur = (prev[id] as string[] | undefined) ?? [];
                if (cur.includes(value)) {
                  return { ...prev, [id]: cur.filter((x) => x !== value) };
                }
                if (cur.length >= max) return prev;
                return { ...prev, [id]: [...cur, value] };
              });
            }}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-sm font-medium text-[#2c2c2c]/60 underline-offset-2 hover:text-[#2c2c2c] hover:underline disabled:opacity-50"
        >
          ← Back to restaurant search
        </button>
        <button
          type="button"
          disabled={!complete || loading}
          onClick={() => {
            if (!isDiscoveryComplete(answers)) return;
            onContinue(answers as AuditDiscoveryAnswers);
          }}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#094413] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#088924] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Starting scan…" : "Run free scan →"}
        </button>
      </div>
    </div>
  );
}
