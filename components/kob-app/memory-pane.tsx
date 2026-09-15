"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/kob-ui/button";
import { useKobStore } from "@/lib/kob/store";

export function MemoryPane() {
  const memory = useKobStore((s) => s.memory);
  const remember = useKobStore((s) => s.remember);
  const addMessage = useKobStore((s) => s.addMessage);
  const setPane = useKobStore((s) => s.setPane);
  const unique = memory.filter(
    (item, index, list) =>
      list.findIndex(
        (other) =>
          other.text.trim().toLowerCase().replace(/\.+$/, "") ===
          item.text.trim().toLowerCase().replace(/\.+$/, ""),
      ) === index,
  );
  const [text, setText] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    remember({
      id: `mem-${Date.now()}`,
      text: value,
      learned: "Taken from what you just told me.",
    });
    addMessage({
      id: `mem-ack-${Date.now()}`,
      role: "kob",
      text: "Understood. I'll keep that and use it from now on.",
    });
    setText("");
    setPane("kob");
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-8">
      <div>
        <h1 className="font-display text-3xl font-medium">Memory</h1>
        <p className="mt-2 max-w-xl text-ink">
          You train KOB by talking. This is what it now does — and will not do.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[1.75rem] bg-cream p-5 sm:p-6">
          <p className="text-sm text-muted">You said</p>
          <ul className="mt-4 space-y-3">
            {unique.map((item) => (
              <li key={item.id} className="rounded-2xl bg-paper px-4 py-3 shadow-card">
                <p className="text-[0.95rem] leading-relaxed text-ink">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[1.75rem] bg-cream p-5 sm:p-6">
          <p className="text-sm text-muted">KOB now does</p>
          <ul className="mt-4 space-y-3">
            {unique.map((item) => (
              <li key={item.id} className="rounded-2xl bg-paper px-4 py-3 shadow-card">
                <p className="text-[0.95rem] leading-relaxed text-ink">{item.learned}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Never discount Friday nights…"
          className="h-12 flex-1 rounded-full border border-line bg-paper px-5 text-base text-espresso outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-espresso/20"
        />
        <Button type="submit" disabled={!text.trim()}>
          Remember this
        </Button>
      </form>
    </div>
  );
}
