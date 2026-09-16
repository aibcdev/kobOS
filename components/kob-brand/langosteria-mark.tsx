import { cn } from "@/lib/kob/utils";

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
  const name = {
    sm: "text-[0.8125rem] sm:text-sm",
    md: "text-sm sm:text-[0.9375rem]",
    lg: "text-base sm:text-lg",
    proof: "text-sm sm:text-base",
  } as const;

  return (
    <span
      className={cn("inline-flex items-baseline gap-2", className)}
      aria-label={withExample ? "Langosteria, example only" : "Langosteria"}
    >
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-[#c23018]",
          name[size],
        )}
        style={{
          fontFamily:
            '"Instrument Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
        }}
      >
        Langosteria
      </span>
      {withExample ? (
        <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] text-[#c23018]/70">
          Example
        </span>
      ) : null}
    </span>
  );
}
