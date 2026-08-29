import Link from "next/link";
import type { ResourceArticle } from "@/lib/marketing/resources";

const shell = "mx-auto max-w-[83rem] px-6 md:px-12";

export function ResourceArticleView({ article }: { article: ResourceArticle }) {
  return (
    <article>
      <header className="border-b border-[#2c2c2c]/5 bg-[#fbf8f5] py-14 md:py-20">
        <div className={shell}>
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">
            Resources · Best-of / compare
          </p>
          <h1 className="font-heading mt-4 max-w-4xl text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[#2c2c2c] md:text-[3.15rem]">
            {article.title}
          </h1>
          <p className="font-body mt-6 max-w-2xl text-base leading-relaxed text-[#2c2c2c]/75">
            {article.description}
          </p>
          <p className="mt-4 text-xs text-[#2c2c2c]/50">
            Updated {article.updatedAt}
            {article.updatedAt !== article.publishedAt ? ` · Published ${article.publishedAt}` : null}
          </p>
        </div>
      </header>

      <div className={`${shell} grid gap-12 py-14 md:grid-cols-[minmax(0,1fr)_16rem] md:py-20`}>
        <div className="min-w-0 space-y-10">
          <section className="rounded-3xl border border-[#088924]/20 bg-[#088924]/5 px-6 py-6 md:px-8">
            <h2 className="font-heading text-lg font-semibold text-[#094413]">Direct answer</h2>
            <p className="font-body mt-3 text-base leading-relaxed text-[#2c2c2c]">{article.directAnswer}</p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Definition</h2>
            <p className="font-body mt-4 text-base leading-relaxed text-[#2c2c2c]/80">{article.definition}</p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Comparison</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#2c2c2c]/10">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-[#f9f3ed] text-[#2c2c2c]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Option</th>
                    <th className="px-4 py-3 font-semibold">Best for</th>
                    <th className="px-4 py-3 font-semibold">Pricing</th>
                    <th className="px-4 py-3 font-semibold">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {article.comparisons.map((row) => (
                    <tr key={row.name} className="border-t border-[#2c2c2c]/8">
                      <td className="px-4 py-3 font-medium text-[#094413]">{row.name}</td>
                      <td className="px-4 py-3 text-[#2c2c2c]/75">{row.bestFor}</td>
                      <td className="px-4 py-3 text-[#2c2c2c]/75">{row.pricing}</td>
                      <td className="px-4 py-3 text-[#2c2c2c]/75">{row.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">{section.heading}</h2>
              <p className="font-body mt-4 text-base leading-relaxed text-[#2c2c2c]/80">{section.body}</p>
            </section>
          ))}

          <section>
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">FAQ</h2>
            <dl className="mt-6 space-y-5">
              {article.faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-[#2c2c2c]/10 bg-[#fbf8f5] px-5 py-4">
                  <dt className="font-heading text-base font-semibold text-[#2c2c2c]">{faq.question}</dt>
                  <dd className="font-body mt-2 text-sm leading-relaxed text-[#2c2c2c]/75">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="rounded-3xl bg-[#094413] px-6 py-8 text-[#fbf8f5] md:px-8">
            <p className="font-heading text-xl font-semibold">{article.ctaLabel}</p>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Free scan of website, Google listing, and reviews — about a minute, no card.
            </p>
            <Link
              href={article.ctaHref}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#088924] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0aa32c]"
            >
              {article.ctaLabel}
            </Link>
          </div>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-5 text-sm">
            <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">
              On this page
            </p>
            <ul className="mt-3 space-y-2 text-[#2c2c2c]/75">
              <li>Direct answer</li>
              <li>Definition</li>
              <li>Comparison</li>
              {article.sections.map((s) => (
                <li key={s.heading}>{s.heading}</li>
              ))}
              <li>FAQ</li>
            </ul>
            <Link href="/resources" className="mt-6 inline-block font-medium text-[#088924] hover:underline">
              ← All resources
            </Link>
          </nav>
        </aside>
      </div>
    </article>
  );
}

export function resourceArticleJsonLd(article: ResourceArticle, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: canonicalUrl,
        author: { "@type": "Organization", name: "KOB" },
        publisher: { "@type": "Organization", name: "KOB", url: "https://trykob.com" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Resources", item: "https://trykob.com/resources" },
          { "@type": "ListItem", position: 2, name: article.title, item: canonicalUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: article.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
