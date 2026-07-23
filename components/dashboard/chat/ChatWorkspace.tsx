"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { appBtnPrimary, appCardSurface, appInput } from "@/lib/app-ui-classes";

type Thread = { id: string; title: string; preview: string; updatedAt: string };
type ChatMessage = { id: string; role: string; content: string };

const SUGGESTION_CHIPS = [
  "Plan this week's posts",
  "Summarise my reviews",
  "Prep for the bank holiday",
  "Draft a reply to my latest review",
];

export function ChatWorkspace({
  restaurantId,
  initialConversationId,
}: {
  restaurantId: string;
  initialConversationId?: string;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [integrations, setIntegrations] = useState<{ provider: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch(`/api/chat/conversations?restaurantId=${encodeURIComponent(restaurantId)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { conversations: Thread[] };
    setThreads(data.conversations);
    if (!activeId && data.conversations[0]) setActiveId(data.conversations[0].id);
  }, [restaurantId, activeId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/chat/conversations/${conversationId}`);
    if (!res.ok) return;
    const data = (await res.json()) as { conversation: { messages: ChatMessage[] } };
    setMessages(data.conversation.messages);
  }, []);

  useEffect(() => {
    void loadThreads();
    void fetch(`/api/integrations?restaurantId=${encodeURIComponent(restaurantId)}`)
      .then((r) => r.json())
      .then((d: { integrations?: { provider: string }[] }) => setIntegrations(d.integrations ?? []))
      .catch(() => {});
  }, [loadThreads, restaurantId]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function newChat() {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { conversation: { id: string } };
    setActiveId(data.conversation.id);
    setMessages([]);
    await loadThreads();
  }

  async function send(textOverride?: string) {
    const outgoing = (textOverride ?? input).trim();
    if (!outgoing || busy) return;
    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { conversation: { id: string } };
      convId = data.conversation.id;
      setActiveId(convId);
    }

    const userMsg = outgoing;
    setInput("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "USER", content: userMsg }]);
    setBusy(true);
    setStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, conversationId: convId, message: userMsg }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
      setStreaming("");
      await loadMessages(convId!);
      await loadThreads();
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: "ASSISTANT", content: "Sorry — chat failed. Try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col lg:flex-row">
      {/* Thread list */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--color-hairline)] lg:flex">
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] p-3">
          <span className="type-label-md font-medium text-[var(--color-ink)]">Chats</span>
          <button type="button" onClick={() => void newChat()} className="type-caption text-[var(--color-primary)]">
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={`mb-1 w-full rounded-[var(--radius-default)] px-3 py-2 text-left text-sm ${
                t.id === activeId
                  ? "bg-[var(--color-surface-warm)] text-[var(--color-ink)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)]"
              }`}
            >
              <p className="truncate font-medium">{t.title}</p>
              <p className="type-caption truncate text-[var(--color-muted-medium)]">{t.preview}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3 lg:hidden">
          <span className="type-label-md font-medium">Chat</span>
          <button type="button" onClick={() => void newChat()} className="type-caption text-[var(--color-primary)]">
            + New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !streaming ? (
            <p className="type-body-md text-center text-[var(--color-muted)]">
              Ask KOB anything — reviews, posts, campaigns, bookings…

            </p>
          ) : null}
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-[var(--radius-md)] px-4 py-3 text-sm ${
                  m.role === "USER"
                    ? "ml-8 bg-[var(--color-ink)] text-[var(--color-text-warm)]"
                    : "mr-8 border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] text-[var(--color-body)]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {streaming ? (
              <div className="mr-8 rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 text-sm">
                {streaming}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="border-t border-[var(--color-hairline)] p-4">
          <div className="mx-auto mb-2 flex max-w-2xl flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => void send(chip)}
                className="rounded-full border border-[var(--color-hairline)] bg-white px-3 py-1 text-xs text-[var(--color-muted)] hover:bg-[var(--color-surface-warm)] disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
          <div className="mx-auto flex max-w-2xl gap-2">
            <input
              className={appInput}
              placeholder="Ask KOB…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
              disabled={busy}
            />
            <button type="button" className={appBtnPrimary} onClick={() => void send()} disabled={busy || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Workspace rail */}
      <aside className="hidden w-52 shrink-0 flex-col border-l border-[var(--color-hairline)] xl:flex">
        <div className="p-3">
          <p className="type-caption font-medium text-[var(--color-ink)]">Workspace</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <div className={appCardSurface}>
            <p className="type-caption font-medium text-[var(--color-ink)]">Connections</p>
            {integrations.length === 0 ? (
              <p className="type-caption mt-2 text-[var(--color-muted)]">None yet</p>
            ) : (
              <ul className="type-caption mt-2 space-y-1 text-[var(--color-muted)]">
                {integrations.map((i) => (
                  <li key={i.provider}>{i.provider.replace(/_/g, " ")}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/dashboard/workspace?r=${encodeURIComponent(restaurantId)}`}
              className="type-caption mt-2 inline-block text-[var(--color-primary)]"
            >
              Connect tools →
            </Link>
          </div>
          <div className={appCardSurface}>
            <p className="type-caption font-medium text-[var(--color-ink)]">Quick links</p>
            <ul className="type-caption mt-2 space-y-1">
              <li>
                <Link href={`/dashboard/apps?r=${encodeURIComponent(restaurantId)}`} className="text-[var(--color-muted)]">
                  Apps hub
                </Link>
              </li>
              <li>
                <Link href={`/dashboard/customers?r=${encodeURIComponent(restaurantId)}`} className="text-[var(--color-muted)]">
                  Customer Insights
                </Link>
              </li>
              <li>
                <Link href={`/dashboard/analytics?r=${encodeURIComponent(restaurantId)}`} className="text-[var(--color-muted)]">
                  Traffic &amp; Sales
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
