import { cn } from "@/lib/kob/utils";

/** Example brand mark — illustrative only; not affiliation. */
export function LangosteriaWordmark({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg" | "proof"
}) {
  const sizes = {
    sm: "text-[1.05rem] tracking-[0.12em]",
    md: "text-[1.35rem] tracking-[0.14em]",
    lg: "text-[1.75rem] tracking-[0.16em] sm:text-[2rem]",
    /** ~20% smaller than lg — homepage proof header */
    proof: "text-[1.4rem] tracking-[0.14em] sm:text-[1.6rem]",
  } as const;

  return (
    <span
      className={cn(
        "inline-block font-serif font-semibold uppercase text-[#e23c1a]",
        sizes[size],
        className,
      )}
      style={{ fontFamily: '"Bodoni Moda", Didot, "Times New Roman", serif' }}
      aria-label="Langosteria"
    >
      LANGOSTERIA
    </span>
  );
}
