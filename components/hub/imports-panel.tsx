"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ImportView } from "@/lib/hub/imports/access";

const STATUS_TEXT: Record<string, string> = {
  PENDING: "Queued",
  PARSING: "Reading…",
  NEEDS_MAPPING: "Needs you: match the columns",
  IMPORTED: "Imported",
  STORED: "Saved; KOB will read PDFs soon",
  FAILED: "Couldn't import",
};

function period(v: ImportView, timeZone: string): string | null {
  if (!v.periodStart || !v.periodEnd) return null;
  const f = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric" });
  const a = f.format(new Date(v.periodStart));
  const b = f.format(new Date(v.periodEnd));
  return a === b ? a : `${a} – ${b}`;
}

function MappingForm({ view, onDone }: { view: ImportView; onDone: (v: ImportView) => void }) {
  const m = view.mapping!;
  const [choice, setChoice] = useState<Record<string, string>>(m.mapping);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/imports/${view.id}/mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping: Object.fromEntries(Object.entries(choice).filter(([, h]) => h)) }),
    });
    const body = (await res.json().catch(() => ({}))) as { import?: ImportView; error?: string };
    setBusy(false);
    if (!res.ok || !body.import) return setError(body.error ?? "Couldn't save that");
    onDone(body.import);
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">KOB couldn&apos;t find {m.missing.map((f) => f.label.toLowerCase()).join(" and ")}. Which columns hold them?</p>
      {m.fields.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
          <span>
            {f.label}
            {f.required ? <span className="text-muted"> (needed)</span> : null}
          </span>
          <select
            className="w-1/2 rounded-xl border border-line bg-paper px-3 py-2"
            value={choice[f.key] ?? ""}
            onChange={(e) => setChoice((c) => ({ ...c, [f.key]: e.target.value }))}
          >
            <option value="">—</option>
            {m.headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="button" disabled={busy} onClick={() => void submit()} className="rounded-full bg-espresso px-4 py-2 text-sm text-paper disabled:opacity-50">
        {busy ? "Saving…" : "Import with these columns"}
      </button>
    </div>
  );
}

export function ImportsPanel({
  restaurantId,
  imports,
  inboundAddresses,
  canUndo,
  timeZone,
}: {
  restaurantId: string;
  imports: ImportView[];
  inboundAddresses: { label: string; address: string }[];
  canUndo: boolean;
  timeZone: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(imports);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const [serverImports, setServerImports] = useState(imports);
  if (serverImports !== imports) {
    // router.refresh() delivered fresh server data.
    setServerImports(imports);
    setItems(imports);
  }
  const working = items.some((i) => i.status === "PENDING" || i.status === "PARSING");
  useEffect(() => {
    if (!working) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [working, router]);

  async function upload(file: File) {
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.set("restaurantId", restaurantId);
    form.set("file", file);
    const res = await fetch("/api/imports", { method: "POST", body: form });
    const body = (await res.json().catch(() => ({}))) as { import?: ImportView; duplicate?: boolean; error?: string };
    setUploading(false);
    if (input.current) input.current.value = "";
    if (!res.ok || !body.import) return setMessage(body.error ?? "Upload failed");
    if (body.duplicate) setMessage("You've already imported that file.");
    setItems((all) => [body.import!, ...all.filter((i) => i.id !== body.import!.id)]);
  }

  async function undo(id: string) {
    if (!window.confirm("Remove everything this import added?")) return;
    const res = await fetch(`/api/imports/${id}`, { method: "DELETE" });
    if (res.ok) setItems((all) => all.filter((i) => i.id !== id));
    else setMessage(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't undo that");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-paper p-6">
        <h2 className="font-display text-xl">Add a file</h2>
        <p className="mt-1 text-sm text-muted">Delivery statements (Deliveroo, Uber Eats, Just Eat, DoorDash), sales exports, guest lists, bookings, or supplier invoices. CSV or PDF, up to 20 MB.</p>
        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.txt,.pdf,text/csv,application/pdf"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          className="mt-4 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-espresso file:px-4 file:py-2 file:text-paper"
        />
        {uploading ? <p className="mt-2 text-sm text-muted">Uploading…</p> : null}
        {message ? <p className="mt-2 text-sm">{message}</p> : null}
        {inboundAddresses.length ? (
          <div className="mt-5 space-y-1 text-sm">
            <p className="text-muted">Or forward them by email:</p>
            {inboundAddresses.map((a) => (
              <p key={a.address}>
                <span className="text-muted">{a.label}: </span>
                <code className="break-all">{a.address}</code>
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {items.length ? (
        <ul className="space-y-3">
          {items.map((v) => (
            <li key={v.id} className="rounded-3xl border border-line bg-paper p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{v.filename}</p>
                  <p className="text-sm text-muted">
                    {v.sourceLabel}
                    {v.origin === "EMAIL" ? " · emailed" : ""}
                    {period(v, timeZone) ? ` · ${period(v, timeZone)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm">{STATUS_TEXT[v.status] ?? v.status}</span>
              </div>
              {v.status === "IMPORTED" ? (
                <p className="mt-2 text-sm text-muted">
                  {v.rowsImported} of {v.rowsTotal} rows imported{v.rowsSkipped ? `; ${v.rowsSkipped} skipped` : ""}.
                </p>
              ) : null}
              {v.errors.length && (v.status === "FAILED" || v.rowsSkipped) ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                  {v.errors.slice(0, 3).map((e, i) => (
                    <li key={i}>{e.row ? `Row ${e.row}: ${e.message}` : e.message}</li>
                  ))}
                </ul>
              ) : null}
              {v.status === "NEEDS_MAPPING" && v.mapping ? <MappingForm view={v} onDone={(nv) => setItems((all) => all.map((i) => (i.id === nv.id ? nv : i)))} /> : null}
              {canUndo && v.status !== "PARSING" ? (
                <button type="button" onClick={() => void undo(v.id)} className="mt-3 text-sm text-muted underline">
                  Undo this import
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No imports yet.</p>
      )}
    </div>
  );
}
