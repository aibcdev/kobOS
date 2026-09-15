import type { ReactNode } from "react";

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <div className="kob-employee min-h-dvh bg-bone text-espresso">{children}</div>;
}
