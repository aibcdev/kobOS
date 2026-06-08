"use client";

export function CoSToast({
  message,
  tone = "info",
  href,
  hrefLabel = "Open",
  onDismiss,
}: {
  message: string;
  tone?: "info" | "success" | "error";
  href?: string;
  hrefLabel?: string;
  onDismiss?: () => void;
}) {
  const bg =
    tone === "error" ? "bg-red-50 border-red-200 text-red-900" : tone === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-[#e5e5e5] text-[#333]";
  return (
    <div className={`fixed bottom-6 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${bg}`} role="status">
      <span className="flex-1">{message}</span>
      {href ? (
        <a href={href} className="shrink-0 font-semibold underline underline-offset-2">
          {hrefLabel}
        </a>
      ) : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs opacity-70" aria-label="Dismiss">
          ✕
        </button>
      ) : null}
    </div>
  );
}
