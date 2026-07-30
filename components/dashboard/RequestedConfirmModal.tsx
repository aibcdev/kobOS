"use client";

import { appBtnPrimary } from "@/lib/app-ui-classes";

/** Shown after an owner queues a Fix this / Approve request for ops. */
export function RequestedConfirmModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-received-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-hairline)] bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="request-received-title" className="font-head text-xl font-semibold text-[var(--color-ink)]">
          Request received
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Our team has this. You&apos;ll get an update on your dashboard within 48 hours.
        </p>
        <button
          type="button"
          onClick={onClose}
          className={`${appBtnPrimary} mt-5 !min-h-11 w-full !rounded-xl text-sm`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
