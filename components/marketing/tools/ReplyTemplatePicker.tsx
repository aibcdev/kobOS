"use client";

import { useState } from "react";
import { REPLY_TEMPLATES, THEME_LABELS, type ReplyTheme } from "@/lib/marketing/tools/reply-templates";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="inline-flex h-9 items-center rounded-full border border-[#2c2c2c]/15 bg-white px-4 text-sm font-medium text-[#094413] hover:bg-[#f9f3ed]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const STARS = [1, 2, 3, 4, 5] as const;

/** Pick a star rating and a theme; shows the matching templates. The full list is also on the page for no-JS readers. */
export function ReplyTemplatePicker() {
  const [stars, setStars] = useState<number>(1);
  const themes = [...new Set(REPLY_TEMPLATES.filter((t) => t.stars === stars).map((t) => t.theme))];
  const [theme, setTheme] = useState<ReplyTheme | "">("");
  const active = themes.includes(theme as ReplyTheme) ? theme : themes[0];
  const matches = REPLY_TEMPLATES.filter((t) => t.stars === stars && t.theme === active);

  return (
    <div className="rounded-3xl border border-[#2c2c2c]/10 bg-white p-6 md:p-8" data-testid="reply-template-picker">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[#2c2c2c]/80">Star rating</span>
          <select
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
            className="h-11 rounded-xl border border-[#2c2c2c]/20 bg-white px-3 text-base text-[#2c2c2c]"
          >
            {STARS.map((s) => (
              <option key={s} value={s}>
                {s}★
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[#2c2c2c]/80">What the review is about</span>
          <select
            value={active}
            onChange={(e) => setTheme(e.target.value as ReplyTheme)}
            className="h-11 rounded-xl border border-[#2c2c2c]/20 bg-white px-3 text-base text-[#2c2c2c]"
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {THEME_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {matches.map((t) => (
        <div key={t.id} className="mt-6 rounded-2xl bg-[#fbf8f5] p-5" aria-live="polite">
          <p className="text-sm text-[#2c2c2c]/70">{t.note}</p>
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-[#2c2c2c]">{t.text}</p>
          <div className="mt-4">
            <CopyButton text={t.text} />
          </div>
        </div>
      ))}
    </div>
  );
}
