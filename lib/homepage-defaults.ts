/**
 * Static fallbacks when Sanity is empty or unreachable.
 * Published `homepage` in Sanity overrides these for production.
 */

import { marketingCopy } from "@/lib/marketing/copy";

export const defaultSiteMeta = {
  title: "KOB | We help independent restaurants get more customers",
  description:
    "Restaurant growth software. Free audit shows where you’re losing diners online—Google, reviews, website—then helps you fill more tables.",
} as const;

export const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1400&auto=format&fit=crop";

/** Section copy paired with the homepage layout (KOB voice). */
export const homepageBandCopy = {
  statsTitle: "Proof you can feel in the first quarter",
  statsSubtitle: "What operators report once priorities are clear and the work ships.",
  statsFootnote: "*Representative benchmarks from partner programmes; your outcomes may vary.",
  statsCtaLabel: "Read the customer stories",
  suiteLabel: "The platform",
  suiteSectionTitle: "Everything guests see before they book—finally in one place.",
  suiteLead:
    "Local discovery, your menu story, and direct demand should not live in three tools nobody owns. KOB lines them up so your team executes one plan, not twelve tabs.",
  missionKicker: "Why we built this",
  missionTitle: "Most restaurants are losing sales online and do not know where.",
  missionBody:
    "Slow mobile sites, thin local SEO, and generic content leak covers every week. KOB exists to surface those leaks early, rank what to fix, and give you the words and layouts that convert—without hiring a full marketing department overnight.",
  portalEyebrow: "AI Growth Agent",
  portalTitle: "A short list of what to do this week—not another scorecard.",
  portalBody:
    "KOB reads search, reviews, reservations, and campaign performance the way a sharp operator would. You get a weekly plan: what to change on the site, what to publish, and what to measure next.",
  portalBullets: [
    "AI-ranked fixes across SEO, pages, and offers—so you start where the money is",
    "On-brand copy and layouts you can publish without a full creative team",
    "One owner for the plan: ship, measure, repeat",
  ],
  portalCtaLabel: "Open Growth Agent",
  bridgingTitle: "Brand, search, and direct demand—one story",
  bridgingBody:
    "Guests decide before they walk in. When your site, local results, and direct paths to book tell the same story, you stop paying to re-win the same customer. KOB keeps that story coherent.",
  casesKicker: "Results",
  casesTitle: "When restaurants stop guessing and start fixing",
  casesLead: "Real operators. Real lifts in discovery, conversion, and direct demand.",
} as const;

export const suiteFourthPillar = {
  title: "Direct demand you own",
  copy: "Fewer dead ends to third-party apps—and clearer paths to book, order, and come back. Margin stays yours when the experience is yours.",
} as const;

export const homepageQuotesExtra = [
  {
    quote:
      "We stopped debating what was wrong. The list was short, we fixed it, covers followed.",
    name: "Marcus Bell",
    role: "Owner, Fired Pizza",
  },
  {
    quote:
      "Search and the menu finally say the same thing. Phones ring before we spend another pound on ads.",
    name: "Sofia Reid",
    role: "Director, Folk Coffee",
  },
] as const;

export const homepageDefaults = {
  hero: {
    eyebrow: "",
    heroRatingLine: marketingCopy.trustLine,
    heroInputPlaceholder: marketingCopy.input.restaurantPlaceholder,
    heroAccentCta: marketingCopy.cta.aiReport,
    heroAccentCtaUrl: "/login",
    heroScore: 72,
    headline: marketingCopy.losingSalesOnline,
    headlineEmphasis: marketingCopy.useAiToFix,
    subheadline: marketingCopy.auditSubline,
    primaryCta: marketingCopy.cta.aiReport,
    primaryCtaUrl: "/audit",
    secondaryCta: "See your growth plan",
    secondaryCtaUrl: "#demo",
    tertiaryCta: "Log in",
    tertiaryCtaUrl: "/login",
    overlayLine1: "La Luna · Austin",
    overlayLine2: "Italian cuisine. Elevated.",
    imageAlt: "Restaurant hero visual",
  },
  socialProof: {
    label: "Built for independent restaurants and cafés",
    logos: [],
  },
  stats: [
    { value: "Free", label: "online scan before you pay" },
    { value: "~1 min", label: "to see guest-facing gaps" },
    { value: "$49", label: "Flex plan / mo" },
  ],
  leadBand: {
    headline: "See where covers leak before you spend another month guessing.",
    intro:
      "Tell us about your restaurant. We will show how KOB ties search, your site, and direct demand into one weekly plan your team can ship—without living in dashboards.",
    formTitle: "Book a demo",
  },
  valueTabs: [
    {
      id: "growth",
      label: "Growth Agent",
      title: "A short list of what to fix this week—not another scorecard.",
      body: "KOB reads search, reviews, reservations, and campaign performance the way a sharp operator would. You get ranked fixes, on-brand copy, and clear next steps so busy teams move revenue, not slide decks.",
      imageUrl:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=900&auto=format&fit=crop",
      imageAlt: "Team reviewing growth priorities",
    },
    {
      id: "seo",
      label: "SEO + local",
      title: "Structured for hungry, high-intent searches.",
      body: "Neighbourhood pages, menus, and schema that tell Google and guests the same story—so you earn clicks that actually book instead of vanity traffic that bounces.",
      imageUrl:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=900&auto=format&fit=crop",
      imageAlt: "Search and analytics",
    },
    {
      id: "demand",
      label: "Direct demand",
      title: "Paths to book and order that you own.",
      body: "Fewer dead ends to third-party apps and clearer CTAs on the pages guests already trust. Margin stays yours when the experience is yours end to end.",
      imageUrl:
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db1?q=80&w=900&auto=format&fit=crop",
      imageAlt: "Guest booking on phone",
    },
  ],
  personas: [
    {
      segment: "For operators",
      title: "One plan the whole leadership team can agree on.",
      body: "Stop debating what is wrong. KOB surfaces the leaks, ranks the fixes, and tracks what moved after you ship.",
      imageUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
      imageAlt: "Restaurant operator",
      statChip: "Daily approve list",
    },
    {
      segment: "For staff",
      title: "Publish updates without a full creative department.",
      body: "Menus, landing pages, and promos arrive on-brand and ready to go live—matched to what search and guests respond to.",
      imageUrl:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop",
      imageAlt: "Front-of-house team",
      statChip: "Hours saved weekly",
    },
    {
      segment: "For guests",
      title: "A site and story that feel as good as the room.",
      body: "Faster mobile pages, honest menus, and clear ways to book or order—so the online journey matches the hospitality inside your doors.",
      imageUrl:
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop",
      imageAlt: "Guests dining",
      statChip: "Higher intent",
    },
  ],
  trustBand: {
    heading: "Operators who stopped guessing and started fixing.",
    subheading: "Representative feedback from partner programmes; your outcomes may vary.",
    badges: ["SOC-minded workflows", "Human-reviewed AI outputs", "Built for hospitality"],
  },
  platformFeatures: [
    {
      title: "See the leaks",
      copy: "Know which pages, menus, and local queries quietly cost you covers—before you spend another month guessing.",
    },
    {
      title: "Ship the fixes",
      copy: "On-brand site updates, menus, and landing pages you can publish fast—matched to what search and guests actually respond to.",
    },
    {
      title: "Win local intent",
      copy: "Structured SEO and schema built for hungry, high-intent searches—not vanity traffic that never books.",
    },
  ],
  productStory: {
    eyebrow: "Platform",
    title: "One layer between your brand and your revenue.",
    body: "Stop stitching spreadsheets, agencies, and dashboards together. KOB keeps web, search, and demand pointed at the same outcome: more guests who choose you directly.",
    imageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1400&auto=format&fit=crop",
    imageAlt: "Restaurant interior",
    ctaLabel: "Get a free demo",
    ctaUrl: "/login",
  },
  contentBand: {
    sectionEyebrow: "Content + SEO",
    sectionAccent: "Built to rank and to sell",
    title: "Words and pages that turn searches into reservations.",
    body: "Blogs, menus, neighbourhood pages, and promos—written to match your voice and structured so Google and guests both understand why you are the pick.",
    ctaLabel: "See content in the plan",
    ctaUrl: "/login",
    fallbackTileImageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
    tiles: [
      {
        title: "Stories that rank",
        copy: "Authority posts that answer what guests actually type—so you earn clicks that convert.",
        imageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Blog and SEO content",
      },
      {
        title: "Menus that sell",
        copy: "Mobile-first menu pages with the right structure so hungry guests choose you, not the tab next door.",
        imageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Menu SEO",
      },
      {
        title: "Local pages that win",
        copy: "Neighbourhood landing pages for every location you serve—clear paths to book or order.",
        imageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Location pages",
      },
      {
        title: "Promos that convert",
        copy: "Timed offers and events with blunt CTAs—so demand spikes do not die in the feed.",
        imageUrl:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop",
        imageAlt: "Campaigns and events",
      },
    ],
  },
  transformBand: {
    eyebrow: "Website",
    title: "Stop leaving money on a slow site.",
    titleEmphasis: "Ship an experience guests trust.",
    beforeImageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1400&auto=format&fit=crop",
    afterImageUrl:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1400&auto=format&fit=crop",
    beforeAlt: "Before website design",
    afterAlt: "After website design",
  },
  testimonial: {
    quote: "We finally saw what was costing covers. Fixed it in weeks—not another strategy deck.",
    name: "Amelia Hart",
    role: "Founder, Bao London",
  },
  caseStudies: [
    {
      name: "Bao London",
      type: "Asian fusion",
      result: "+62% direct orders",
      metricLabel: "Direct orders",
      imageUrl:
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Bao London case study",
    },
    {
      name: "Folk Coffee",
      type: "Neighbourhood cafe",
      result: "+47% returning customers",
      metricLabel: "Repeat visits",
      imageUrl:
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Folk Coffee case study",
    },
    {
      name: "Fired Pizza",
      type: "Casual dining",
      result: "-23% delivery app reliance",
      metricLabel: "App reliance",
      imageUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      imageAlt: "Fired Pizza case study",
    },
  ],
  closing: {
    headline: "Stop guessing why covers are soft.",
    headlineEmphasis: "Get the fixes that move the needle.",
    body: "Book a free demo. We will walk your online guest journey, show the leaks KOB surfaces, and leave you with a short list you can act on this week.",
    primaryCta: "Get a free demo",
    primaryCtaUrl: "/audit",
    secondaryCta: "Open Growth Agent",
    secondaryCtaUrl: "/dashboard",
  },
  nav: {
    demoUrl: "/demo",
    loginUrl: "/login",
    dashboardUrl: "/dashboard",
  },
} as const;
