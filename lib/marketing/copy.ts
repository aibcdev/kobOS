/**
 * KOB public marketing copy — restaurant growth: get more customers.
 * AI is how we deliver; customers are the promise.
 */
import { industryStats, industryStatsFootnote } from "@/lib/marketing/industry-stats";

export const marketingCopy = {
  tagline: "Your restaurant's ultimate employee.",
  trustLine: "Built for independent restaurants and cafés",
  trustLineShort: "For busy owners who want a clear next step",

  /** Primary promise — homepage hero (mock: italic “ultimate” in forest) */
  heroHeadline: "Your restaurant’s ultimate employee.",
  heroHeadlineLead: "Your restaurant’s",
  heroHeadlineAccent: "ultimate",
  heroHeadlineTail: "employee.",
  heroPromiseLines: [
    "Get more customers.",
    "Keep more customers.",
    "Ask KOB to do everything else.",
  ] as const,
  heroTrustBadge: "Trusted by 500+ restaurants & cafés",
  heroSubline:
    "KOB watches your website, Google listing, and reviews—then gives you a short daily list. Approve in one tap. Nothing goes live without you.",
  heroSublineSecondary: "Start with a free scan. See what guests see before they book.",
  heroProofPoints: ["Free scan", "Takes 1 minute", "No card required"] as const,
  heroSocialProof: "Trusted by 500+ restaurants & cafés",
  heroAnnotation: "Every morning. Clear. Simple. Saves hours.",
  losingSalesOnline: "Most restaurants lose customers online and don’t know where",
  useAiToFix: " Free hospitality perception report.",

  auditSubline:
    "In about a minute we’ll show what guests notice on your site and Google listing—photos, hours, reviews, and trust. No card.",
  productSubline:
    "See the gaps, approve drafts, and request website or SEO work with credits—without juggling five apps.",

  trustBandBody:
    "Most guests decide online before they visit. KOB shows what they see, gives you a daily list to approve, and lets you request deliverables with credits.",

  howItWorksEyebrow: "How KOB works",
  howItWorksHeadline: "How KOB works",
  howItWorksSubline:
    "We watch what guests see online. You approve a short daily list. Stay consistent without another agency.",
  howItWorksProof: "Free scan first · You stay in control · Cancel anytime",

  midCtaHeadline: "See how many customers you’re losing online",
  midCtaCardTitle: "Free restaurant audit—where bookings leak before they reach you.",
  midCtaCardBody: "Enter your restaurant name or website. Results in about a minute. No card.",

  finalCtaEyebrow: "Start free",
  finalCtaHeadline: "Stop guessing why Tuesday is quiet.",
  finalCtaSubline:
    "Run a free audit. See what’s costing you customers online. Then use KOB to get more, keep more, and fill the gaps.",
  finalCtaFinePrint: "Free audit · No card · Nothing goes live without you",

  closingSuggestive: "We found ways restaurants lose customers online every week. Start with your free audit.",

  cta: {
    aiReport: "Run free scan →",
    freeDemo: "Book a demo",
    freeScan: "Run free scan",
    seeProduct: "See how it works",
    viewPricing: "View pricing",
    getDemo: "Talk to us",
    getStarted: "Get started",
    startTrial: "Start 7-day free trial",
  },

  nav: {
    freeAiReport: "Free scan",
  },

  pricing: {
    lead: "Restaurant growth software. Clear pricing.",
    subline: "One job: more customers. No long-term contracts.",
    feeLine: "Start with a free audit—then tools that help you fill tables and keep guests coming back.",
    closingEyebrow: "Ready when you are",
    closingHeadline: "See where you’re losing customers. Pick a plan when it makes sense.",
  },

  footerTagline:
    "Restaurant growth software—get more customers, keep more customers, ask KOB to do the rest.",

  scanning: {
    headline: "Auditing…",
    subline: "Finding where you’re losing customers online—vs restaurants nearby that fill more tables.",
    contextLine: "Most guests decide online before they book—we're finding where you lose them.",
    mapStatus: (name: string) => `Checking ${name} & local competitors`,
    gbpStatus: "Checking Google Business Profile",
    websiteStatus: (host: string) => `Checking ${host}`,
    mobileStatus: "Checking mobile experience",
    reviewsStatus: "Checking Google Reviews",
  },

  graderPrompts: [
    { label: "Where am I losing customers?", icon: "search" as const },
    { label: "What's broken on my site?", icon: "site" as const },
    { label: "Who's beating me nearby?", icon: "crown" as const },
  ] as const,

  graderReport: {
    onlineHealth: "Customer-acquisition score",
  },

  auditScanStages: {
    fetch: "Checking your website",
    render: "Reviewing pages & menus",
    extract: "Pulling photos & reviews",
    score: "Scoring where bookings leak",
    benchmark: "Writing your summary",
    done: "Almost ready",
    local: "Checking local visibility",
  },

  auditUnlock: {
    modalTitle: "Unlock your free audit",
    modalBody:
      "See your score, where guests drop off, and the highest-impact fixes—Google, menu, reviews, homepage. Then get a clear list to fill more tables.",
    modalSubtitleCompetitors:
      "See why {competitorA} and {competitorB} are winning more of your local customers.",
    emailLabel: "Work email",
    phoneLabel: "Mobile number",
    submit: "Unlock full audit",
    submitting: "Unlocking…",
    legal:
      "By continuing you agree to our Terms of Service and Privacy Policy. We use your details to save your report. Your account is created when you start a paid plan or free trial.",
  },

  auditInsights: [
    {
      quote: `${industryStats.websiteBeforeVisit.value} of guests check you online first—weak presence loses bookings before they call.`,
      tag: "Discovery",
    },
    {
      quote: `${industryStats.deterredByWeakSite.value} are put off by a weak website—that’s lost covers, not “SEO jargon.”`,
      tag: "Website",
    },
    {
      quote: `Menus with great photos see ${industryStats.menuPhotoOrders.value} more orders—your audit flags what guests actually see.`,
      tag: "Menu",
    },
  ] as const,

  auditInsightsClosing:
    "You don’t need another AI toy—you need more customers. Start with the free audit.",

  auditUpgrade: {
    headline: "Turn the audit into more bookings",
    body: "Your free audit found where customers drop off. Start your trial for a daily list that helps you get more—and keep more—guests.",
    bullets: [
      "Daily growth tasks from your audit—Google, reviews, posts, hours",
      "Plain English: what’s costing you customers and why",
      "Approve in one tap—we prepare the work for you to review",
      "Ask KOB when you need a campaign or a fix",
      "7-day free trial · cancel anytime",
    ] as const,
  },

  auditReport: {
    dailyHelperLabel: "Your growth list",
    shareCopied: "Link copied",
    shareFailed: "Could not share — link copied instead",
    unlockNavHint: "Unlock your audit to view this section",
  },

  demo: {
    step1Headline: `Tell us about your restaurant—${industryStats.websiteBeforeVisit.value} of guests check you online first`,
    step1Hint: "We'll audit where you're losing customers before they book.",
    step2Subline: "Your audit shows what’s costing you covers.",
    photosFeatureDesc: `Menus with great photos see ${industryStats.menuPhotoOrders.value} more orders—your audit flags photo gaps.`,
  },

  auth: {
    headline: "Get more customers—start here",
    statLine:
      "Most guests decide online before they visit. KOB shows where you lose them—then helps you fill more tables.",
    bullets: [
      "Free restaurant audit in about a minute",
      "See where you’re losing customers online",
      "Daily growth list plus ask KOB for campaigns and fixes",
    ] as const,
    signInTitle: "Welcome back",
    signUpTitle: "Create your account",
    signInBlurb: "We'll email you a secure sign-in link.",
    signUpBlurb: "No password needed. We create your workspace when you confirm your email.",
    emailLabel: "Work email",
    submitSignIn: "Send sign-in link",
    submitSignUp: "Create account",
    sent: "Check your email for the magic link.",
  },

  dashboardOnboarding: {
    body: "Add your restaurant—we'll show where you're losing customers online and what to fix first.",
    websiteHint: `${industryStats.websiteBeforeVisit.value} of guests check this before they visit. We'll score it in your first audit.`,
  },

  marqueeQuotes: [
    "Finally clear on why Tuesdays were quiet—and what to fix first.",
    "We didn’t realise how many guests never made it to a booking.",
    "I approve a review reply in the morning and get on with service.",
    "It’s not another marketing tool—it’s about filling tables.",
    "Google and reviews in one place beat juggling five apps.",
    "Ask KOB when it’s raining and we need to fill covers tonight.",
  ] as const,

  input: {
    restaurantPlaceholder: "Find your restaurant",
  },

  industryStatsFootnote,
} as const;
