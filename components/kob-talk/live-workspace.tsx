"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { KobWordmark } from "@/components/kob-brand/kob-mark";
import { GreenOrb } from "@/components/kob-home/green-orb";
import type {
  TalkConnector,
  TalkMessage,
  TalkProvider,
} from "@/lib/kob/talk/types";

const statusLabel = {
  disconnected: "Not connected",
  unverified: "Connected · not checked yet",
  connected: "Connected",
  reconnect: "Reconnect needed",
  unavailable: "Setup needed",
};
const starters = [
  "What needs my attention today?",
  "Find recent supplier emails",
  "What's on my calendar tomorrow?",
];

export function LiveWorkspace({
  restaurant,
  restaurants,
  conversationId,
  initialMessages,
  initialConnectors,
  connectionResult,
  connectionError,
}: {
  restaurant: { id: string; name: string };
  restaurants: { id: string; name: string }[];
  conversationId: string;
  initialMessages: TalkMessage[];
  initialConnectors: TalkConnector[];
  connectionResult: string | null;
  connectionError: string | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [connectors, setConnectors] = useState(initialConnectors);
  const [connectionsOpen, setConnectionsOpen] = useState(
    Boolean(connectionResult || connectionError),
  );
  const [connectionNotice, setConnectionNotice] = useState(
    Boolean(connectionResult),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const sending = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const activeCount = connectors.filter(
    (c) => c.state === "connected" || c.state === "unverified",
  ).length;
  const lastRequest = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.text;

  const refreshConnections = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/talk/connectors?restaurantId=${encodeURIComponent(restaurant.id)}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error("Couldn't refresh connections. Please retry.");
      const data = (await response.json()) as { connectors: TalkConnector[] };
      setConnectors(data.connectors);
    } catch {
      setError("Couldn't refresh connections. Please retry.");
    }
  }, [restaurant.id]);

  useEffect(() => {
    const listener = () => {
      void refreshConnections();
    };
    window.addEventListener("focus", listener);
    return () => window.removeEventListener("focus", listener);
  }, [refreshConnections]);
  useEffect(() => {
    if (connectionsOpen) {
      document
        .getElementById("talk-connections")
        ?.scrollIntoView({ block: "start" });
      return;
    }
    end.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "end",
    });
  }, [messages, busy, connectionsOpen]);

  async function send(text: string) {
    if (!text.trim() || sending.current) return;
    sending.current = true;
    setBusy(true);
    setConnectionNotice(false);
    setError(null);
    setInput("");
    const requestId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: requestId, role: "user", text: text.trim() },
    ]);
    try {
      const response = await fetch("/api/talk/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          conversationId,
          requestId,
          text: text.trim(),
        }),
        signal: AbortSignal.timeout(65_000),
      });
      const data = (await response.json()) as {
        error?: string;
        message?: TalkMessage;
      };
      if (!response.ok || !data.message)
        throw new Error(
          data.error ??
            "Couldn't complete your request. Reload to check for a saved reply.",
        );
      setMessages((current) => [...current, data.message!]);
      await refreshConnections();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== "TimeoutError"
          ? failure.message
          : "The reply is taking longer than expected. Reload to check your saved conversation.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
      composer.current?.focus();
    }
  }

  function connect(provider: TalkProvider) {
    window.location.assign(
      `/api/talk/connectors/${provider}/connect?restaurantId=${encodeURIComponent(restaurant.id)}`,
    );
  }
  async function disconnect(provider: TalkProvider) {
    setDisconnecting(provider);
    setError(null);
    try {
      const response = await fetch(
        `/api/talk/connectors/${provider}?restaurantId=${encodeURIComponent(restaurant.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Couldn't disconnect. Please retry.");
      await refreshConnections();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Couldn't disconnect.",
      );
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-bone text-espresso">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <Link href="/" aria-label="KOB home">
          <KobWordmark />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{restaurant.name}</p>
          <p className="text-xs text-muted">
            {activeCount
              ? `${activeCount} account${activeCount === 1 ? "" : "s"} connected`
              : "Your restaurant assistant"}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={connectionsOpen}
          aria-controls="talk-connections"
          onClick={() => setConnectionsOpen(!connectionsOpen)}
          className="min-h-11 rounded-full border border-line px-4 text-sm"
        >
          Connections
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
          {connectionsOpen ? (
            <section
              id="talk-connections"
              aria-label="Your connections"
              className="space-y-4 rounded-3xl border border-line bg-paper p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-2xl">Your connections</h2>
                <button
                  type="button"
                  onClick={() => setConnectionsOpen(false)}
                  className="min-h-11 px-2 text-sm underline"
                >
                  Close
                </button>
              </div>
              <p className="text-sm text-muted">
                Read-only access for this restaurant&apos;s shared workspace.
                Accounts and saved replies are available to its team.
                Disconnecting stops future access; existing conversation history
                stays.
              </p>
              {restaurants.length > 1 ? (
                <label className="block text-sm">
                  Restaurant
                  <select
                    className="mt-1 block w-full rounded-xl border border-line bg-paper p-3"
                    value={restaurant.id}
                    onChange={(event) =>
                      window.location.assign(
                        `/app?r=${encodeURIComponent(event.target.value)}`,
                      )
                    }
                  >
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {connectors.map((connector) => (
                <article
                  key={connector.provider}
                  className="rounded-2xl border border-line p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{connector.name}</h3>
                    <span className="text-xs text-muted">
                      {statusLabel[connector.state]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {connector.description}
                  </p>
                  {connector.checkedAt ? (
                    <p className="mt-2 text-xs text-muted">
                      Last read:{" "}
                      {new Date(connector.checkedAt).toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {connector.state === "unavailable" ? (
                      <p className="text-sm text-muted">
                        This connection needs setup by KOB before you can sign
                        in.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => connect(connector.provider)}
                        className="min-h-11 rounded-full bg-espresso px-4 text-sm text-paper disabled:opacity-50"
                      >
                        {connector.state === "disconnected"
                          ? "Connect"
                          : "Reconnect"}{" "}
                        {connector.name}
                      </button>
                    )}
                    {connector.hasAccount ? (
                      <button
                        type="button"
                        disabled={busy || Boolean(disconnecting)}
                        onClick={() => void disconnect(connector.provider)}
                        className="min-h-11 rounded-full border border-line px-4 text-sm disabled:opacity-50"
                      >
                        {disconnecting === connector.provider
                          ? "Disconnecting…"
                          : "Disconnect"}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
              <p className="text-xs text-muted">
                Google Business Profile publishing, POS, and reservation-system
                connections are not available here yet.
              </p>
            </section>
          ) : null}
          {connectionError ? (
            <p
              role="alert"
              className="rounded-2xl border border-line bg-paper p-4 text-sm"
            >
              {connectionError}
            </p>
          ) : null}
          {connectionNotice ? (
            <div role="status" className="rounded-2xl bg-paper p-4 text-sm">
              <p>Account connected. KOB will check it when you ask.</p>
              {lastRequest ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send(lastRequest)}
                  className="mt-3 min-h-11 rounded-full bg-espresso px-4 text-paper disabled:opacity-50"
                >
                  Continue my request
                </button>
              ) : null}
            </div>
          ) : null}
          {!messages.length ? (
            <section className="space-y-5 py-8">
              <GreenOrb size="sm" />
              <h1 className="font-display text-3xl sm:text-4xl">
                What can I take off your plate?
              </h1>
              <p className="max-w-lg text-muted">
                I can check your inbox and calendar, find what matters, and help
                you prepare a reply. Connect an account when you need it.
              </p>
              <div className="flex flex-wrap gap-2">
                {starters.map((text) => (
                  <button
                    key={text}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(text)}
                    className="min-h-11 rounded-2xl border border-line bg-paper px-4 py-3 text-left text-sm"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {messages.map((message) => (
            <article
              key={message.id}
              aria-label={
                message.role === "user" ? "Your message" : "KOB reply"
              }
              className={`rounded-2xl p-4 ${message.role === "user" ? "ml-8 bg-cream" : "border border-line bg-paper"}`}
            >
              <p className="mb-2 text-xs font-medium text-muted">
                {message.role === "user" ? "You" : "KOB"}
              </p>
              <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
                {message.text}
              </p>
              {message.needsConnection?.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled={busy}
                  onClick={() => setConnectionsOpen(true)}
                  className="mt-3 mr-2 min-h-11 rounded-full bg-espresso px-4 text-sm text-paper disabled:opacity-50"
                >
                  Connect {provider === "GMAIL" ? "Gmail" : "Google Calendar"}
                </button>
              ))}
              {message.sources?.length ? (
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Sources">
                  {message.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-full truncate rounded-full border border-line px-3 py-2 text-xs underline"
                      title={`Read ${new Date(source.checkedAt).toLocaleString()}`}
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              ) : null}
              {message.activity?.length ? (
                <details className="mt-3 text-xs text-muted">
                  <summary className="cursor-pointer py-2">
                    What KOB checked
                  </summary>
                  <ul className="space-y-2 py-2">
                    {message.activity.map((item, index) => (
                      <li key={index}>
                        {item.label}:{" "}
                        {item.status === "complete"
                          ? "read successfully"
                          : (item.detail ?? "not available")}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          ))}
          {busy ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-2xl bg-paper p-4"
            >
              <GreenOrb size="sm" />
              <p className="text-sm text-muted">Working on your request…</p>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-line bg-paper p-4 text-sm"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 min-h-11 underline"
              >
                Reload conversation
              </button>
            </div>
          ) : null}
          <div ref={end} />
        </div>
      </div>
      <form
        className="shrink-0 border-t border-line bg-paper px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-line bg-cream/50 p-2 pl-4">
          <textarea
            ref={composer}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            maxLength={8000}
            aria-label="Message KOB"
            placeholder="Ask about your restaurant…"
            className="min-w-0 flex-1 resize-none bg-transparent py-2 text-base outline-none"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="min-h-11 rounded-full bg-espresso px-5 text-sm text-paper disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-center text-[0.65rem] text-muted">
          Reads your connected accounts. Drafts stay here. Nothing is sent or
          published.
        </p>
      </form>
    </div>
  );
}
