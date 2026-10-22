"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-espresso px-4 py-2 text-sm text-paper print:hidden">
      Print
    </button>
  );
}
