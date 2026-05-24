import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { HomeFeatureSplit } from "@/components/home/sections/HomeFeatureSplit";
import { HomeLeadSection } from "@/components/home/sections/HomeLeadSection";
import { HomePersonaGrid } from "@/components/home/sections/HomePersonaGrid";
import { HomeStoryCarousel } from "@/components/home/sections/HomeStoryCarousel";
import { HomeTrustMarquee } from "@/components/home/sections/HomeTrustMarquee";
import { HomeValueTabs } from "@/components/home/sections/HomeValueTabs";
import type { HomepageContent } from "@/lib/homepage-merge";

const PHONE_AVATAR_SRC =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=96&h=96&fit=crop&q=80";

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function CtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

/** `{component.nav-link}` */
const navLinkClass =
  "type-body-md rounded-[var(--radius-default)] px-4 py-2 text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-muted-faint)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20";

/** `{component.nav-link-text}` — Login */
const navLoginClass =
  "type-button rounded-[var(--radius-default)] px-4 py-2 text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-muted-faint)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/20";

/** `{component.button-primary-nav}` */
const navPrimaryBtn =
  "type-button inline-flex min-h-[52px] items-center justify-center rounded-[var(--radius-default)] bg-[var(--color-ink)] px-6 py-4 text-[var(--color-text-warm)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-surface-dark-hover)]";

/** `{component.button-primary}` */
const btnPrimary =
  "type-button inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-7 py-4 text-[var(--color-on-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]";

/** `{component.button-accent}` */
const btnAccent =
  "type-button inline-flex min-h-[56px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-7 py-4 text-[var(--color-on-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-accent-active)]";

/** `{component.button-secondary}` */
const btnSecondary =
  "type-button inline-flex min-h-12 items-center justify-center rounded-[var(--radius-default)] bg-[var(--color-surface-soft)] px-6 py-4 text-[var(--color-ink)] ring-1 ring-inset ring-[var(--color-hairline)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-surface-warm)]";

/** `{component.button-text}` */
const btnText =
  "type-body-md inline-flex items-center justify-center px-2 text-[var(--color-muted)] underline-offset-4 transition-colors hover:text-[var(--color-ink)] hover:underline";

/** `{component.card-surface}` — flat, no shadow */
const cardSurface =
  "rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-[var(--spacing-lg)] text-[var(--color-body)]";

const sectionY = "py-10 sm:py-[var(--spacing-section)]";

function PhoneScoreMockup({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className="w-full max-w-[280px] overflow-hidden rounded-t-[var(--radius-xl)] bg-[var(--color-ink)] text-[var(--color-text-inverse)] shadow-[var(--shadow-card-elevated)] sm:max-w-[320px]"
      aria-hidden
    >
      {/* `{component.phone-mockup-header}` */}
      <div className="type-body-md flex items-center justify-between px-4 pb-1 pt-3 font-normal leading-none text-[var(--color-text-inverse)]">
        <span className="tabular-nums">9:41</span>
        <span className="flex items-center gap-1.5 opacity-90" aria-hidden>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
            <path d="M0 7h3v4H0V7zm4-2h3v6H4V5zm4-2h3v8H8V3zm4 2h3v6h-3V5z" />
          </svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
            <path d="M7.5 0C3.9 0 1 2.2 0 5h15c-1-2.8-3.9-5-7.5-5zm0 11c3.6 0 6.5-2.2 7.5-5H0c1 2.8 3.9 5 7.5 5z" />
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="currentColor">
            <rect x="1" y="1" width="21" height="10" rx="2" stroke="currentColor" fill="none" strokeWidth="1.2" />
            <rect x="23" y="4" width="1.5" height="4" rx="0.5" />
            <rect x="3" y="3" width="17" height="6" rx="1" opacity="0.35" />
          </svg>
        </span>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--color-hairline)] ring-1 ring-white/10">
          <Image src={PHONE_AVATAR_SRC} alt="" fill className="object-cover" sizes="48px" />
        </div>
        <span className="type-title-sm text-[var(--color-text-inverse)]">Your restaurant</span>
      </div>

      <div className="p-4 pb-6">
        <div
          className="rounded-[var(--radius-lg)] bg-[var(--color-surface-warm)] p-[var(--spacing-lg)] text-[var(--color-ink)]"
          style={{ boxShadow: "var(--shadow-inset-hairline)" }}
        >
          <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-6">
            <div className="relative h-[120px] w-[120px] shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
                <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(44,44,44,0.12)" strokeWidth="7" />
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="var(--color-warning)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-head text-[48px] font-semibold leading-none tracking-[-1.44px] text-[var(--color-ink)]">
                  {clamped}
                </span>
                <span className="type-body-sm mt-0.5 text-[var(--color-muted-medium)]">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage({ content }: { content: HomepageContent }) {
  const c = content;
  const p = c.pageBand;
  const heroScore =
    typeof c.hero.heroScore === "number" && !Number.isNaN(c.hero.heroScore) ? c.hero.heroScore : 72;

  return (
    <main className="min-h-screen bg-[var(--color-surface-soft)] text-[var(--color-body)]">
      {/* `{component.top-nav}` */}
      <header className="sticky top-0 z-50 h-[72px] bg-[var(--color-surface-soft)] text-[var(--color-ink)]">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-[var(--spacing-md)]">
          <Link href="/" className="shrink-0 no-underline">
            <span className="type-title-sm">KOB</span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
            <a className={navLinkClass} href="#demo">
              Overview
            </a>
            <a className={navLinkClass} href="#suite">
              Suite
            </a>
            <a className={navLinkClass} href="#mission">
              Mission
            </a>
            <a className={navLinkClass} href="#portal">
              Growth Agent
            </a>
            <a className={navLinkClass} href="#content">
              Content
            </a>
            <a className={navLinkClass} href="#cases">
              Cases
            </a>
            <a className={navLinkClass} href="#transform">
              Transform
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href={c.nav.loginUrl} className={`${navLoginClass} hidden sm:inline`}>
              Log in
            </Link>
            <CtaLink href={c.nav.demoUrl} className={navPrimaryBtn}>
              {c.hero.primaryCta}
            </CtaLink>
          </div>
        </div>
      </header>

      {/* `{component.hero-band}` */}
      <section
        id="hero"
        className="scroll-mt-[72px] bg-[var(--color-canvas)] px-[var(--spacing-md)] pb-[140px] pt-[var(--spacing-section)] text-[var(--color-ink)]"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
            <div className="w-full max-w-[42rem] text-center">
              <p className="type-caption mb-4 text-[var(--color-muted)]">{c.hero.heroRatingLine}</p>
              <h1 className="type-display-xl">
                {c.hero.headline}
                <span className="mt-1 block">{c.hero.headlineEmphasis}</span>
              </h1>
              <p className="type-body-md mx-auto mt-6 max-w-xl text-pretty text-[var(--color-muted)] leading-snug">
                {c.hero.subheadline}
              </p>

              <div className="mx-auto mt-10 max-w-xl">
                <div className="flex flex-col gap-[var(--spacing-xs)] rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] p-[var(--spacing-xs)] sm:flex-row sm:items-stretch">
                  <label className="sr-only" htmlFor="hero-restaurant-input">
                    Restaurant name
                  </label>
                  <input
                    id="hero-restaurant-input"
                    name="restaurant"
                    type="text"
                    autoComplete="organization"
                    placeholder={c.hero.heroInputPlaceholder}
                    className="type-body-md min-h-[56px] w-full flex-1 rounded-[var(--radius-lg)] border-0 bg-[var(--color-surface-soft)] px-6 py-[18px] text-[var(--color-ink)] placeholder:text-[var(--color-muted-medium)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:min-w-0"
                  />
                  <CtaLink href={c.hero.heroAccentCtaUrl} className={`${btnAccent} w-full sm:w-auto`}>
                    {c.hero.heroAccentCta}
                  </CtaLink>
                </div>
              </div>

              <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-4">
                <CtaLink href={c.hero.secondaryCtaUrl} className={btnText}>
                  {c.hero.secondaryCta}
                </CtaLink>
                <span className="hidden text-[var(--color-muted-soft)] sm:inline" aria-hidden>
                  ·
                </span>
                <CtaLink href={c.hero.tertiaryCtaUrl} className={btnText}>
                  {c.hero.tertiaryCta}
                </CtaLink>
              </div>
            </div>

            <div className="flex w-full max-w-[320px] shrink-0 justify-center lg:-mb-20 lg:translate-y-6">
              <PhoneScoreMockup score={heroScore} />
            </div>
          </div>
        </div>
      </section>

      <HomeLeadSection
        leadBand={c.leadBand}
        stats={c.stats}
        statsTitle={p.statsTitle}
        statsSubtitle={p.statsSubtitle}
        statsFootnote={p.statsFootnote}
        statsCtaLabel={p.statsCtaLabel}
      />

      <section
        id="logos"
        className="scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-[var(--spacing-md)] py-10 sm:py-12"
      >
        <div className="mx-auto max-w-[1440px] text-center">
          <p className="type-caption text-[var(--color-muted)]">{c.socialProof.label}</p>
          <div className="type-label-md mt-6 grid grid-cols-2 gap-x-6 gap-y-5 text-[var(--color-muted-medium)] sm:mt-8 sm:grid-cols-4 lg:grid-cols-8">
            {c.socialProof.logos.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>
        </div>
      </section>

      <HomeStoryCarousel stories={c.carouselStories} />

      <HomeValueTabs tabs={[...c.valueTabs]} />

      <HomePersonaGrid personas={[...c.personas]} />

      <section id="suite" className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-beige)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto max-w-[1440px]">
          <p className="type-caption text-[var(--color-muted-medium)]">{p.suiteLabel}</p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="type-title-md max-w-2xl">{p.suiteSectionTitle}</h2>
            <p className="type-body-md max-w-xl text-pretty text-[var(--color-muted)] leading-snug lg:text-right">{p.suiteLead}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:gap-5">
            {c.suiteCards.map((card, i) => (
              <div key={`${card.title}-${i}`} className={cardSurface}>
                <span className="type-caption tabular-nums text-[var(--color-muted-medium)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="type-title-sm mt-3">{card.title}</h3>
                <p className="type-body-md mt-3 text-pretty text-[var(--color-muted)] leading-snug">{card.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="mission" className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="type-caption text-[var(--color-muted-medium)]">{p.missionKicker}</p>
          <h2 className="type-title-md mt-6">{p.missionTitle}</h2>
          <p className="type-body-md mt-6 text-pretty text-[var(--color-muted)] leading-snug">{p.missionBody}</p>
        </div>
      </section>

      <section id="portal" className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 overflow-hidden rounded-[var(--radius-image-hero)] ring-1 ring-[var(--color-hairline)] lg:order-1">
            <Image
              src={c.productStory.imageUrl}
              alt={c.productStory.imageAlt}
              width={1200}
              height={800}
              className="aspect-[4/3] w-full object-cover"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="type-caption text-[var(--color-muted-medium)]">{p.portalEyebrow}</p>
            <h2 className="type-title-md mt-4">{p.portalTitle}</h2>
            <p className="type-body-md mt-5 text-pretty text-[var(--color-muted)] leading-snug">{p.portalBody}</p>
            <ul className="mt-8 space-y-3">
              {p.portalBullets.map((line) => (
                <li key={line} className="type-body-md flex gap-3 text-pretty leading-snug">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ink)]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <CtaLink href={c.nav.dashboardUrl} className={`${btnPrimary} mt-10`}>
              {p.portalCtaLabel}
              <span aria-hidden>→</span>
            </CtaLink>
          </div>
        </div>
      </section>

      <section className={`border-t border-[var(--color-hairline)] bg-[var(--color-surface-beige)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="type-title-md">{p.bridgingTitle}</h2>
          <p className="type-body-md mt-6 text-pretty text-[var(--color-muted)] leading-snug">{p.bridgingBody}</p>
        </div>
      </section>

      <HomeFeatureSplit
        band={c.contentBand}
        cta={
          <CtaLink href={c.contentBand.ctaUrl} className={`${btnPrimary} inline-flex`}>
            {c.contentBand.ctaLabel}
          </CtaLink>
        }
      />

      <section id="case-grid" className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto max-w-[1440px]">
          <p className="type-caption text-[var(--color-muted-medium)]">{p.casesKicker}</p>
          <h2 className="type-title-md mt-4 max-w-3xl">{p.casesTitle}</h2>
          <p className="type-body-md mt-4 max-w-2xl text-pretty text-[var(--color-muted)] leading-snug">{p.casesLead}</p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {c.caseStudies.map((cs) => (
              <article key={cs.name} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
                <div className="relative aspect-[5/3]">
                  <Image src={cs.imageUrl} alt={cs.imageAlt} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
                </div>
                <div className="p-[var(--spacing-lg)]">
                  <div className="type-title-sm">{cs.name}</div>
                  {cs.type ? <div className="type-body-sm mt-1 text-[var(--color-muted-medium)]">{cs.type}</div> : null}
                  <div className="type-caption mt-4 inline-block rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-3 py-1.5 font-medium text-[var(--color-ink)]">
                    {cs.result}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HomeTrustMarquee trustBand={c.trustBand} quotes={c.quotesForHome} />

      <section id="transform" className={`scroll-mt-[72px] border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] ${sectionY}`}>
        <div className="mx-auto max-w-[1440px]">
          <p className="type-caption text-[var(--color-muted-medium)]">{c.transformBand.eyebrow}</p>
          <h2 className="type-title-md mt-4 max-w-2xl">
            {c.transformBand.title}{" "}
            <span className="text-[var(--color-muted)]">{c.transformBand.titleEmphasis}</span>
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
              <div className="type-caption border-b border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-4 py-2.5 text-[var(--color-muted-medium)]">
                Before
              </div>
              <Image
                src={c.transformBand.beforeImageUrl}
                alt={c.transformBand.beforeAlt}
                width={1200}
                height={640}
                className="aspect-[16/10] w-full object-cover opacity-95"
              />
            </div>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)]">
              <div className="type-caption border-b border-[var(--color-hairline)] bg-[var(--color-surface-warm)] px-4 py-2.5 text-[var(--color-muted-medium)]">
                After
              </div>
              <Image
                src={c.transformBand.afterImageUrl}
                alt={c.transformBand.afterAlt}
                width={1200}
                height={640}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-3xl border-t border-[var(--color-hairline)] pt-14 text-center sm:mt-20 sm:pt-16">
          <h2 className="type-title-md">
            {c.closing.headline} <span className="text-[var(--color-muted)]">{c.closing.headlineEmphasis}</span>
          </h2>
          <p className="type-body-md mx-auto mt-6 max-w-xl text-pretty text-[var(--color-muted)] leading-snug">{c.closing.body}</p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <CtaLink href={c.closing.primaryCtaUrl} className={btnPrimary}>
              {c.closing.primaryCta}
              <span aria-hidden>→</span>
            </CtaLink>
            <CtaLink href={c.closing.secondaryCtaUrl} className={btnSecondary}>
              {c.closing.secondaryCta}
            </CtaLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-[var(--spacing-md)] py-[var(--spacing-xl)] text-[var(--color-muted)]">
        <div className="type-body-sm mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 sm:flex-row">
          <span>© {new Date().getFullYear()} KOB</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href={c.nav.loginUrl} className="hover:text-[var(--color-ink)]">
              Log in
            </Link>
            <span aria-hidden className="text-[var(--color-muted-soft)]">
              ·
            </span>
            <Link href={c.nav.demoUrl} className="hover:text-[var(--color-ink)]">
              {c.hero.primaryCta}
            </Link>
            <span aria-hidden className="text-[var(--color-muted-soft)]">
              ·
            </span>
            <Link href={c.nav.dashboardUrl} className="hover:text-[var(--color-ink)]">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
