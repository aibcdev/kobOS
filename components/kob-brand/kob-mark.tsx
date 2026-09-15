import { cn } from "@/lib/kob/utils";

type Size = "sm" | "md" | "lg" | "xl" | "hero";

const sizes: Record<Size, string> = {
  sm: "size-7 text-[0.7rem]",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
  hero: "size-20 text-2xl sm:size-24",
};

export function KobMark({
  className,
  working = false,
  size = "md",
}: {
  className?: string
  working?: boolean
  size?: Size
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-espresso font-medium tracking-[-0.06em] text-cream",
        sizes[size],
        working ? "ring-2 ring-cream/70 ring-offset-2 ring-offset-transparent" : null,
        className,
      )}
      aria-hidden="true"
    >
      K
    </span>
  );
}

export function KobWordmark({
  className,
  invert = false,
}: {
  className?: string
  invert?: boolean
  markSize?: Size
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium tracking-[-0.04em]",
        invert ? "text-paper" : "text-espresso",
        className,
      )}
    >
      <span className="text-[1.05rem] leading-none">KOB</span>
    </span>
  );
}
