import type { ReactNode } from "react";

/** Results dashboard is full-bleed (uses AuditFunnelHeader). */
export default function AuditResultLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
