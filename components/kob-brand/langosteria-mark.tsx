import { cn } from "@/lib/kob/utils";
import { EXAMPLE_BRAND } from "@/lib/kob/demo-proof";

/** Example brand mark — illustrative only; not affiliation. */
export function LangosteriaWordmark({
  className,
  size = "md",
  withExample = false,
}: {
  className?: string
  size?: "sm" | "md" | "lg" | "proof"
  /** Show a quiet “example” label beside the name */
  withExample?: boolean
}) {
  const heights = {
    sm: "h-4 sm:h-5",
    md: "h-5 sm:h-6",
    lg: "h-7 sm:h-8",
    proof: "h-5 sm:h-6",
  } as const;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={withExample ? "Langosteria, example only" : "Langosteria"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={EXAMPLE_BRAND.logoSrc}
        alt="Langosteria"
        className={cn("w-auto object-contain object-left", heights[size])}
      />
      {withExample ? (
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[#c23018]/75">
          Example
        </span>
      ) : null}
    </span>
  );
}
