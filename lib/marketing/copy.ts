/**
 * KOB public marketing copy — visibility audit → fix list → growth platform.
 */
import { industryStats, industryStatsFootnote } from "@/lib/marketing/industry-stats";

export const marketingCopy = {
  tagline: "The AI Chief of Staff for Restaurants.",
  trustLine: "Trusted by over 500 retailers, restaurants and markets worldwide",
  trustLineShort: "Trusted by 500+ restaurants & cafés",

  heroHeadline: "See the gap between how good you are—and how you look online.",
  heroSubline:
    "Every morning, see what needs attention, why it matters, and approve fixes in one tap. Start with a free hospitality perception report.",
  /** Split headline (line 1 + line 2) for hero and legacy pages */
  losingSalesOnline: "See the gap between how good you are—and how you look online.",
  useAiToFix: " Free hospitality perception report.",

  auditSubline:
    "KOB analyses how guests perceive your brand online—positioning, imagery, trust, and booking confidence. About a minute. No card.",
  productSubline:
    "Websites, SEO, ordering, and marketing for hospitality—plus an AI report that shows what to fix before you spend.",

  trustBandBody:
    "Most guests decide online before they ever visit. KOB helps independent restaurants and cafés fix the gaps that lose orders—before you spend on ads or a full rebuild.",

  finalCtaSubline: "Fix the online gaps that cost you covers—starting with a free scan.",

  cta: {
    aiReport: "Run free AI scan",
    freeDemo: "Book a demo",
    freeScan: "Run free AI scan",
    seeProduct: "See how it works",
    viewPricing: "View pricing",
    getDemo: "Book a demo",
    getStarted: "Get started",
    startTrial: "Start free trial",
  },

  nav: {
    freeAiReport: "Free AI scan",
  },

  pricing: {
    lead: "Simple pricing that fits your restaurant.",
    subline: "Get the complete KOB platform. Pay month-to-month—no long-term contracts.",
    feeLine: "Own your website, ordering, and guest data—with AI that tells you what to fix first.",
  },

  scanning: {
    headline: "Building your perception report…",
    subline: "Analysing how guests perceive your brand—vs premium UK hospitality standards.",
    contextLine: "Most guests decide on your website before they visit—we're analysing what they see.",
    mapStatus: (name: string) => `Scanning ${name} & competitors`,
    gbpStatus: "Scanning Google Business Profile",
    websiteStatus: (host: string) => `Scanning ${host}`,
    mobileStatus: "Scanning mobile experience",
    reviewsStatus: "Scanning Google Reviews",
  },

  graderReport: {
    onlineHealth: "Digital positioning",
  },

  auditScanStages: {
    fetch: "Checking your website",
    render: "Reviewing pages & menus",
    extract: "Pulling photos & reviews",
    score: "Scoring against strong brands",
    benchmark: "Writing your AI summary",
    done: "Almost ready",
    local: "Checking local visibility",
  },

  auditUnlock: {
    modalTitle: "Unlock your free report",
    modalBody:
      "See scores, photo gaps, and competitor gaps—the same issues that put 7 in 10 guests off weak sites. Then start your free trial in the dashboard—no sales call.",
    modalSubtitleCompetitors:
      "See why {competitorA} and {competitorB} are beating you on Google.",
    emailLabel: "Work email",
    phoneLabel: "Mobile number",
    submit: "Unlock full report",
    submitting: "Unlocking…",
    legal:
      "By continuing you agree to our Terms of Service and Privacy Policy. We use your details to save your report and set up your account.",
  },

  auditInsights: [
    {
      quote: `${industryStats.websiteBeforeVisit.value} of guests check your site first—slow pages and weak photos lose them before they order.`,
      tag: "Website experience",
    },
    {
      quote: `${industryStats.visitForMenu.value} visit mainly to see your menu—if Google can't find it, they go elsewhere.`,
      tag: "SEO",
    },
    {
      quote: `Nearly ${industryStats.deterredByWeakSite.value} are put off by a bad mobile experience before they ever book.`,
      tag: "Performance",
    },
  ] as const,

  auditInsightsClosing:
    "Industry research shows the fix is often simpler than a full rebrand.",

  auditUpgrade: {
    bullets: [
      "Full keyword roadmap & 30/60/90 plan",
      "Competitor deep dive for your city",
      "AI Growth Agent — weekly priorities",
      "Fix the online gaps industry research links to lost orders and bookings",
      "7-day free trial · cancel anytime",
    ] as const,
  },

  demo: {
    step1Headline: `Tell us about your restaurant—${industryStats.websiteBeforeVisit.value} of guests check you online first`,
    step1Hint: "We'll scan what they see before they visit or order.",
    step2Subline: "Your report shows what's costing you covers online.",
    photosFeatureDesc: `Menus with great photos see ${industryStats.menuPhotoOrders.value} more orders—your scan flags photo gaps.`,
  },

  auth: {
    headline: "Your Chief of Staff workspace starts here",
    statLine: "Most guests decide on your website before they visit. KOB shows you what to fix first—then helps you approve it daily.",
    bullets: [
      "Free AI visibility scan",
      "See why guests leave before they order",
      "Website, ordering, and marketing in one place",
    ] as const,
    signInTitle: "Welcome back",
    signUpTitle: "Create your account",
    signInBlurb: "We'll email you a secure sign-in link.",
    signUpBlurb: "No password needed. First time here? We create your workspace when you confirm your email.",
    emailLabel: "Work email",
    submitSignIn: "Send sign-in link",
    submitSignUp: "Create account",
    sent: "Check your email for the magic link.",
  },

  dashboardOnboarding: {
    body: "Add your restaurant—we'll benchmark your online presence against what strong venues do.",
    websiteHint: `${industryStats.websiteBeforeVisit.value} of guests check this before they visit. We'll score it in your first scan.`,
  },

  marqueeQuotes: [
    "Finally a clear list of what to fix on our site—without paying an agency first.",
    "We didn't realise 7 in 10 guests were judging us online before they booked.",
    "Direct ordering on our own brand feels professional—and guests use it.",
    "Adding proper menu photos alone changed how many people ordered direct.",
    "Weekly priorities from the Growth Agent keep us focused.",
    "One place to fix hours, menu, and ordering beat juggling five apps.",
  ] as const,

  input: {
    restaurantPlaceholder: "Find your restaurant name",
  },

  industryStatsFootnote,
} as const;
