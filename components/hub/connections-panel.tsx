"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CapabilityView, CardState, ConnectorCard } from "@/lib/hub/connections";

const CAP_CHIP: Record<CapabilityView["state"], { text: string; className: string }> = {
  LIVE: { text: "Live", className: "bg-emerald-100 text-emerald-900" },
  PARTIAL: { text: "Partial", className: "bg-amber-100 text-amber-900" },
  OFF: { text: "Off", className: "bg-line text-muted" },
};

const CARD_CHIP: Record<CardState, { text: string; className: string }> = {
  CONNECTED: { text: "Connected", className: "bg-emerald-100 text-emerald-900" },
  DEGRADED: { text: "Having trouble", className: "bg-amber-100 text-amber-900" },
  REAUTH: { text: "Reconnect needed", className: "bg-red-100 text-red-900" },
  PENDING_APPROVAL: { text: "Waiting on approval", className: "bg-line text-muted" },
  PENDING_SETUP: { text: "Needs you: pick locations", className: "bg-amber-100 text-amber-900" },
  AVAILABLE: { text: "Not connected", className: "bg-line text-muted" },
  COMING_SOON: { text: "Coming soon", className: "bg-line text-muted" },
};

const CONTRACT_TEXT: Record<string, string> = {
  sales: "sales",
  menu: "menu",
  guests: "guests",
  bookings: "bookings",
  payments: "payments",
  shifts: "shifts",
};

function feedsText(card: ConnectorCard): string {
  return card.feeds.map((f) => CONTRACT_TEXT[f] ?? f.replace(/_/g, " ")).join(", ");
}

function KeyForm({ card, restaurantId, onDone }: { card: ConnectorCard; restaurantId: string; onDone: () => void }) {
  const method = card.connect.kind === "keys" ? card.connect : null;
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!method) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/hub/connections/${card.provider}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, fields: values }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Couldn't connect");
    onDone();
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {method.fields.map((f) => (
        <label key={f.name} className="block text-sm">
          <span>{f.label}</span>
          <input
            type={f.secret ? "password" : "text"}
            autoComplete="off"
            spellCheck={false}
            value={values[f.name] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2"
          />
        </label>
      ))}
      {method.helpUrl ? (
        <p className="text-sm text-muted">
          <a href={method.helpUrl} target="_blank" rel="noreferrer" className="underline">
            Where to find these in {card.displayName}
          </a>
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-full bg-espresso px-4 py-2 text-sm text-paper disabled:opacity-50">
        {busy ? "Checking…" : `Connect ${card.displayName}`}
      </button>
    </form>
  );
}

type LocationOption = { externalId: string; name: string; address?: string };

function LocationPicker({ card, restaurantId, onDone }: { card: ConnectorCard; restaurantId: string; onDone: () => void }) {
  const [locations, setLocations] = useState<LocationOption[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const res = await fetch(`/api/hub/connections/${card.provider}/locations?restaurantId=${encodeURIComponent(restaurantId)}`);
      const body = (await res.json().catch(() => ({}))) as { locations?: LocationOption[]; selected?: string[]; error?: string };
      if (!live) return;
      if (!res.ok || !body.locations) return setError(body.error ?? "Couldn't load your locations");
      setLocations(body.locations);
      setPicked(new Set(body.selected ?? []));
    })();
    return () => {
      live = false;
    };
  }, [card.provider, restaurantId]);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/hub/connections/${card.provider}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, locationIds: [...picked] }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Couldn't save that");
    onDone();
  }

  return (
    <div className="mt-3 rounded-2xl border border-line p-4 text-sm">
      <p>Your {card.displayName} account has more than one location. Which ones are this restaurant? KOB only counts sales from the ones you tick.</p>
      {locations === null && !error ? <p className="mt-2 text-muted">Loading…</p> : null}
      {locations?.map((l) => (
        <label key={l.externalId} className="mt-2 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={picked.has(l.externalId)}
            onChange={(e) =>
              setPicked((p) => {
                const n = new Set(p);
                if (e.target.checked) n.add(l.externalId);
                else n.delete(l.externalId);
                return n;
              })
            }
          />
          <span>
            {l.name}
            {l.address ? <span className="text-muted"> · {l.address}</span> : null}
          </span>
        </label>
      ))}
      {error ? <p className="mt-2 text-red-700">{error}</p> : null}
      {locations?.length ? (
        <button type="button" disabled={busy || !picked.size} onClick={() => void save()} className="mt-3 rounded-full bg-espresso px-4 py-2 text-paper disabled:opacity-50">
          {busy ? "Saving…" : "Use these locations"}
        </button>
      ) : null}
    </div>
  );
}

function ConnectorItem({
  card,
  restaurantId,
  canManage,
  timeZone,
}: {
  card: ConnectorCard;
  restaurantId: string;
  canManage: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chip = CARD_CHIP[card.state];
  const connected =
    card.state === "CONNECTED" || card.state === "DEGRADED" || card.state === "REAUTH" || card.state === "PENDING_APPROVAL" || card.state === "PENDING_SETUP";
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone, dateStyle: "medium", timeStyle: "short" });
  const failing = card.streams.filter((s) => s.failing);
  const backfilling = card.state === "CONNECTED" && card.streams.some((s) => !s.backfillDone);

  const [confirming, setConfirming] = useState(false);
  const [dataChoice, setDataChoice] = useState<"keep" | "delete">("keep");

  async function disconnect() {
    const q = new URLSearchParams({ restaurantId, data: dataChoice });
    const res = await fetch(`/api/hub/connections/${card.provider}?${q}`, { method: "DELETE" });
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't disconnect");
    setConfirming(false);
    router.refresh();
  }

  const connectAction =
    card.connect.kind === "oauth" ? (
      <a href={card.connect.href} className="rounded-full bg-espresso px-4 py-2 text-sm text-paper">
        {card.state === "REAUTH" ? "Reconnect" : "Connect"}
      </a>
    ) : card.connect.kind === "keys" ? (
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full bg-espresso px-4 py-2 text-sm text-paper">
        {open ? "Cancel" : card.state === "REAUTH" ? "Update keys" : "Connect"}
      </button>
    ) : null;

  return (
    <li className="rounded-3xl border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{card.displayName}</p>
          <p className="text-sm text-muted">Brings in {feedsText(card)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${chip.className}`}>{chip.text}</span>
      </div>
      {connected && card.lastSuccessAt ? <p className="mt-2 text-sm text-muted">Last synced {fmt.format(new Date(card.lastSuccessAt))}</p> : null}
      {backfilling ? <p className="mt-2 text-sm text-muted">Pulling your history; this can take a few minutes.</p> : null}
      {failing.length ? (
        <p className="mt-2 text-sm text-amber-900">
          Trouble syncing {failing.map((s) => s.stream).join(", ")}. KOB will keep retrying.
        </p>
      ) : null}
      {card.state === "REAUTH" ? <p className="mt-2 text-sm text-red-800">{card.displayName} stopped accepting KOB&apos;s access. Reconnect to resume.</p> : null}
      {canManage ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {card.state === "AVAILABLE" || card.state === "REAUTH" ? connectAction : null}
          {connected && !confirming ? (
            <button type="button" onClick={() => setConfirming(true)} className="text-sm text-muted underline">
              Disconnect
            </button>
          ) : null}
        </div>
      ) : null}
      {confirming ? (
        <div className="mt-3 rounded-2xl border border-line p-4 text-sm">
          <p className="font-medium">Disconnect {card.displayName}? KOB stops syncing straight away. What should happen to what it already has?</p>
          <label className="mt-2 flex items-start gap-2">
            <input type="radio" className="mt-1" checked={dataChoice === "keep"} onChange={() => setDataChoice("keep")} />
            <span>
              Keep sales history for my reports
              <span className="block text-muted">Guests&apos; emails, phone numbers and names from {card.displayName} are deleted after 30 days.</span>
            </span>
          </label>
          <label className="mt-2 flex items-start gap-2">
            <input type="radio" className="mt-1" checked={dataChoice === "delete"} onChange={() => setDataChoice("delete")} />
            <span>
              Delete everything from {card.displayName} now
              <span className="block text-muted">Orders, bookings, menu links and guests it brought in. Your weekly totals for those days change.</span>
            </span>
          </label>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => void disconnect()} className="rounded-full bg-espresso px-4 py-2 text-paper">
              Disconnect
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-muted underline">
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {open ? <KeyForm card={card} restaurantId={restaurantId} onDone={() => (setOpen(false), router.refresh())} /> : null}
      {card.state === "PENDING_SETUP" ? (
        canManage ? (
          <LocationPicker card={card} restaurantId={restaurantId} onDone={() => router.refresh()} />
        ) : (
          <p className="mt-2 text-sm text-muted">An owner or admin needs to pick which locations belong to this restaurant.</p>
        )
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </li>
  );
}

export function ConnectionsPanel({
  restaurantId,
  cards,
  capabilities,
  canManage,
  timeZone,
  importsHref,
  notice,
}: {
  restaurantId: string;
  cards: ConnectorCard[];
  capabilities: CapabilityView[];
  canManage: boolean;
  timeZone: string;
  importsHref: string;
  notice: { kind: "ok" | "error"; text: string } | null;
}) {
  const [showMore, setShowMore] = useState(false);
  const isConnected = (c: ConnectorCard) => c.state !== "AVAILABLE" && c.state !== "COMING_SOON";
  const primary = cards.filter((c) => c.inRegion || isConnected(c));
  const more = cards.filter((c) => !c.inRegion && !isConnected(c));

  return (
    <div className="space-y-8">
      {notice ? <p className={`rounded-2xl px-4 py-3 text-sm ${notice.kind === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>{notice.text}</p> : null}

      <section>
        <h2 className="font-display text-xl">What KOB can do</h2>
        <p className="mt-1 text-sm text-muted">Each feature runs on real data. Partial means it works, and connecting more makes it sharper.</p>
        <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-paper">
          {capabilities.map((c) => (
            <li key={c.feature} className="flex items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium">{c.label}</p>
                {c.sources.length ? <p className="text-sm text-muted">Using {c.sources.join(", ")}</p> : null}
                {c.hint ? <p className="text-sm text-muted">{c.hint}</p> : null}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${CAP_CHIP[c.state].className}`}>{CAP_CHIP[c.state].text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl">Your systems</h2>
        <p className="mt-1 text-sm text-muted">
          KOB reads from these; it never changes anything in them without asking you first. No API?{" "}
          <a href={importsHref} className="underline">
            Upload or forward a file instead
          </a>
          .
        </p>
        <ul className="mt-4 space-y-3">
          {primary.map((c) => (
            <ConnectorItem key={c.provider} card={c} restaurantId={restaurantId} canManage={canManage} timeZone={timeZone} />
          ))}
        </ul>
        {more.length ? (
          <div className="mt-4">
            <button type="button" onClick={() => setShowMore((s) => !s)} className="text-sm text-muted underline">
              {showMore ? "Hide other regions" : `Show ${more.length} more from other regions`}
            </button>
            {showMore ? (
              <ul className="mt-3 space-y-3">
                {more.map((c) => (
                  <ConnectorItem key={c.provider} card={c} restaurantId={restaurantId} canManage={canManage} timeZone={timeZone} />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {!canManage ? <p className="mt-3 text-sm text-muted">Only owners and admins can change connections.</p> : null}
      </section>
    </div>
  );
}
