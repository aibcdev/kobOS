import Image from "next/image";
import Link from "next/link";

export type SaasCardItem = {
  title: string;
  description: string;
  href?: string;
  image?: string;
  imageAlt?: string;
};

export function SaasCardGrid({ items, columns = 2 }: { items: SaasCardItem[]; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 4 ? "md:grid-cols-2 lg:grid-cols-4" : columns === 3 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className={`grid grid-cols-1 gap-6 ${colClass}`}>
      {items.map((item) => {
        const inner = (
          <>
            {item.image ? (
              <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-2xl border border-[#2c2c2c]/5">
                <Image src={item.image} alt={item.imageAlt ?? ""} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              </div>
            ) : null}
            <h2 className="font-heading text-xl font-semibold tracking-tight text-[#094413]">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#2c2c2c]/75">{item.description}</p>
            {item.href ? (
              <span className="mt-4 inline-block text-sm font-medium text-[#088924] underline-offset-4 hover:underline">
                Learn more
              </span>
            ) : null}
          </>
        );

        const cls =
          "flex flex-col rounded-3xl border border-[#2c2c2c]/10 bg-[#fbf8f5] p-8 transition-shadow hover:shadow-[0_16px_40px_-12px_rgba(9,68,19,0.12)]";

        return item.href ? (
          <Link key={item.title} href={item.href} className={cls}>
            {inner}
          </Link>
        ) : (
          <article key={item.title} className={cls}>
            {inner}
          </article>
        );
      })}
    </div>
  );
}
