import type { ReactNode } from "react";

const shell = "mx-auto max-w-[83rem] px-6 md:px-12";

export function SaasSection({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`py-14 md:py-24 ${className}`.trim()}>
      <div className={shell}>{children}</div>
    </section>
  );
}
