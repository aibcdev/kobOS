import type { ReactNode } from "react";

/** Scanning is full-bleed Owner-style funnel. */
export default function AuditScanningLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
