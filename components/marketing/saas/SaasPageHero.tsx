import Link from "next/link";
import type { ReactNode } from "react";

const saasShell = "mx-auto max-w-[83rem] px-6 md:px-12";

export function SaasPageHero({
  title,
  description,
  eyebrow,
  variant = "warm",
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  variant?: "warm" | "inset";
  children?: ReactNode;
}) {
  const band =
    variant === "warm" ? "border-b border-[#2c2c2c]/5 bg-[#fbf8f5]" : "border-b border-[#2c2c2c]/5 bg-[#f9f3ed]";

  return (
    <section className={`${band} py-14 md:py-20`}>
      <div className={saasShell}>
        {eyebrow ? (
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading mt-4 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[#2c2c2c] md:text-5xl">
          {title}
        </h1>
        {description ? <p className="font-body mt-6 max-w-2xl text-base leading-relaxed text-[#2c2c2c]/75">{description}</p> : null}
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

const saasPrimaryCtaClasses =
  "inline-flex h-11 items-center justify-center rounded-full bg-[#094413] px-6 text-sm font-medium text-[#fbf8f5] transition-colors hover:bg-[#088924] md:h-12 md:px-8";

export function SaasPrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={saasPrimaryCtaClasses}>
      {children}
    </Link>
  );
}

const saasSecondaryCtaClasses =
  "inline-flex h-11 items-center justify-center rounded-full border border-[#094413]/20 bg-transparent px-6 text-sm font-medium text-[#094413] transition-colors hover:border-[#094413]/40 hover:bg-[#094413]/5 md:h-12 md:px-8";

export function SaasSecondaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={saasSecondaryCtaClasses}>
      {children}
    </Link>
  );
}
