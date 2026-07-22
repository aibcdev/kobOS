"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { cosCard } from "@/lib/dashboard/chief-of-staff-theme";

const SUGGESTIONS = [
  "Show me the top 20 leads in London",
  "Queue the best 25 for email",
  "Which cities have the most prospects?",
  "Find independents with weak websites",
];

export function OutboundAskBar({
  restaurantId,
  prospectCount,
}: {
  restaurantId: string;
  prospectCount: number;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(
    async (override?: string) => {
      const outgoing = (override ?? text).trim();
      if (!outgoing || busy) return;
      setBusy(true);
      setErr(null);
      setReply(null);
      try {
        let convId: string | null = null;
        const create = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });
        if (create.ok) {
          const data = (await create.json()) as { conversation: { id: string } };
          convId = data.conversation.id;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            conversationId: convId,
            message: `${outgoing}\n\n(Context: Sales pipeline / Lead engine — ${prospectCount} prospects loaded. Act on lead data when asked.)`,
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setErr(data.error ?? "Could not reach KOB.");
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setErr("No response stream.");
          return;
        }
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setReply(full);
        }
        setText("");
        router.refresh();
      } catch {
        setErr("Network error — try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, prospectCount, restaurantId, router, text],
  );

  return (
    <div className="space-y-3">
      <div className={`${cosCard} flex items-center gap-2 p-3`}>
        <input
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#1a1a1a] outline-none placeholder:text-[#999]"
          placeholder="What would you like to get done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={busy}
          aria-label="What would you like to get done?"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !text.trim()}
          className="flex h-10 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] px-4 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          {busy ? "…" : "Ask KOB"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void submit(s)}
            disabled={busy}
            className="rounded-full border border-[var(--color-hairline)] bg-white px-3 py-1.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-ink)]"
          >
            {s}
          </button>
        ))}
      </div>

      {err ? <p className="type-body-sm text-red-700">{err}</p> : null}
      {reply ? (
        <div className={`${cosCard} type-body-sm whitespace-pre-wrap p-4 text-[var(--color-ink)]`}>
          {reply}
        </div>
      ) : null}
    </div>
  );
}
