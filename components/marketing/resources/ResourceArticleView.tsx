import Link from "next/link";
import { RelatedGuideLinks } from "@/components/marketing/resources/RelatedGuideLinks";
import { articlePath, type ResourceArticle } from "@/lib/marketing/resources";
import { canonicalUrl } from "@/lib/seo/page-metadata";
import { ORGANIZATION_ID } from "@/lib/seo/structured-data";

const shell = "mx-auto max-w-[83rem] px-6 md:px-12";

export function ResourceArticleView({ article }: { article: ResourceArticle }) {
  return (
    <article>
      <header className="border-b border-[#2c2c2c]/5 bg-[#fbf8f5] py-14 md:py-20">
        <div className={shell}>
          <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">
            {article.comparisons.length ? "Guides · Compare" : "Guides · How to"}
          </p>
          <h1 className="font-heading mt-4 max-w-4xl text-balance text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[#2c2c2c] md:text-[3.15rem]">
            {article.title}
          </h1>
          {article.tldr ? (
            <div className="mt-6 max-w-2xl rounded-2xl border border-[#088924]/25 bg-white px-5 py-4" data-testid="article-tldr">
              <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">In short</p>
              <p className="font-body mt-2 text-base leading-relaxed text-[#2c2c2c]">{article.tldr}</p>
            </div>
          ) : null}
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
            <h2 className="font-heading text-lg font-semibold text-[#094413]">{article.questionH2}</h2>
            <p className="font-body mt-3 text-base leading-relaxed text-[#2c2c2c]">{article.directAnswer}</p>
            {article.tool ? (
              <p className="mt-4 text-sm">
                <Link href={article.tool.href} className="font-medium text-[#088924] underline underline-offset-2">
                  {article.tool.label}
                </Link>
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Definition</h2>
            <p className="font-body mt-4 text-base leading-relaxed text-[#2c2c2c]/80">{article.definition}</p>
          </section>

          {article.comparisons.length ? (
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
          ) : null}

          {article.sections.map((section, i) => (
            <div key={section.heading} className="space-y-10">
              <section>
                <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">{section.heading}</h2>
                <p className="font-body mt-4 text-base leading-relaxed text-[#2c2c2c]/80">{section.body}</p>
              </section>
              {i === 0 && article.firsthand ? (
                <section className="rounded-3xl border border-[#2c2c2c]/10 bg-[#fbf8f5] px-6 py-6 md:px-8">
                  <h2 className="font-heading text-lg font-semibold text-[#2c2c2c]">From our work with restaurants</h2>
                  <p className="font-body mt-3 text-base leading-relaxed text-[#2c2c2c]/80">{article.firsthand.body}</p>
                </section>
              ) : null}
            </div>
          ))}

          {article.sources?.length ? (
            <section>
              <h2 className="font-heading text-2xl font-semibold text-[#2c2c2c]">Sources</h2>
              <ul className="font-body mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#2c2c2c]/75">
                {article.sources.map((source) => (
                  <li key={source.href}>
                    <a href={source.href} rel="noopener" target="_blank" className="text-[#088924] underline-offset-2 hover:underline">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
              KOB drafts your review replies and Google listing fixes. You approve, tap once, and post.
            </p>
            <Link
              href={article.ctaHref}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#088924] px-6 text-sm font-medium text-white transition-colors hover:bg-[#0aa32c]"
            >
              {article.ctaLabel}
            </Link>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
              {article.ctaHref !== "/trial" ? (
                <Link href="/trial" className="underline underline-offset-2 hover:text-white">
                  Try KOB free for 7 days
                </Link>
              ) : null}
              <Link href="/product" className="underline underline-offset-2 hover:text-white">
                See what KOB does
              </Link>
              <Link href="/pricing" className="underline underline-offset-2 hover:text-white">
                Pricing
              </Link>
            </p>
          </div>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="rounded-2xl border border-[#2c2c2c]/10 bg-white p-5 text-sm" aria-label="On this page">
            <p className="font-mono-brand text-xs font-semibold uppercase tracking-[0.12em] text-[#088924]">
              On this page
            </p>
            <ul className="mt-3 space-y-2 text-[#2c2c2c]/75">
              <li>{article.questionH2}</li>
              <li>Definition</li>
              {article.comparisons.length ? <li>Comparison</li> : null}
              {article.sections.map((s) => (
                <li key={s.heading}>{s.heading}</li>
              ))}
              <li>FAQ</li>
            </ul>
            <RelatedGuideLinks path={articlePath(article.slug)} className="mt-6 border-t border-[#2c2c2c]/10 pt-5" />
            <Link href="/resources" className="mt-6 inline-block font-medium text-[#088924] hover:underline">
              ← All guides
            </Link>
          </nav>
        </aside>
      </div>
    </article>
  );
}

export function resourceArticleJsonLd(article: ResourceArticle, pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${pageUrl}#article`,
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        mainEntityOfPage: pageUrl,
        author: { "@type": "Organization", name: "KOB", url: canonicalUrl("/") },
        publisher: { "@id": ORGANIZATION_ID },
        image: `${canonicalUrl(articlePath(article.slug))}/opengraph-image`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Guides", item: canonicalUrl("/resources") },
          { "@type": "ListItem", position: 2, name: article.title, item: pageUrl },
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
