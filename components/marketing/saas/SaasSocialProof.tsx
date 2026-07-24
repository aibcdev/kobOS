import { MARKETING_AVATARS } from "@/lib/marketing/assets";

type SaasSocialProofProps = {
  label: string;
  /** Match cream page bg so avatar rings blend */
  ringClassName?: string;
  className?: string;
};

/** Avatars + ★★★★★ + short trust line — matches homepage mock social-proof row. */
export function SaasSocialProof({
  label,
  ringClassName = "border-[#f9f6f1]",
  className = "",
}: SaasSocialProofProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <div className="flex -space-x-2">
        {MARKETING_AVATARS.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            width={32}
            height={32}
            className={`h-8 w-8 rounded-full border-2 object-cover ${ringClassName}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-[#2c2c2c]/70">
        <span className="tracking-tight text-[#e8a317]" aria-label="5 stars">
          ★★★★★
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}
