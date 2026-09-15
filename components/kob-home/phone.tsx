import type { ReactNode } from "react";
import { cn } from "@/lib/kob/utils";

export function Phone({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-72 rounded-3xl bg-espresso p-2 shadow-soft",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-2xl bg-bone">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-espresso" />
        <div className="min-h-[34rem] px-3 pb-8 pt-12">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          <span className="h-1 w-28 rounded-full bg-espresso/30" />
        </div>
      </div>
    </div>
  );
}
