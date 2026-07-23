/**
 * KOB public marketing copy — free scan → daily task list → approve / request with credits.
 */
import { industryStats, industryStatsFootnote } from "@/lib/marketing/industry-stats";

export const marketingCopy = {
  tagline: "Your restaurant's ultimate employee.",
  trustLine: "Built for independent restaurants and cafés",
  trustLineShort: "For busy owners who want a clear next step",

  heroHeadline: "Your restaurant’s ultimate employee.",
  heroHeadlineLead: "Your restaurant’s",
  heroHeadlineAccent: "ultimate",
  heroHeadlineTail: "employee.",
  heroTrustBadge: "Trusted by 500+ restaurants & cafés",
  heroSubline:
    "KOB watches your website, Google listing, and reviews—then gives you a short daily list. Approve in one tap. Nothing goes live without you.",
  heroSublineSecondary:
    "Start with a free scan. See what guests see before they book.",
  heroProofPoints: ["Free scan", "Takes 1 minute", "No card required"] as const,
  heroSocialProof: "Trusted by 500+ restaurants & cafés",
  heroAnnotation: "Every morning. Clear. Simple. Saves hours.",
  losingSalesOnline: "Your website is your front door online",
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

  midCtaHeadline: "Your website is your front door online",
  midCtaCardTitle: "See what guests see—before another cover walks past.",
  midCtaCardBody: "Enter your restaurant name or website. Results in about a minute. No card.",

  finalCtaEyebrow: "Start free",
  finalCtaHeadline: "Don’t leave tonight’s bookings to a weak first impression.",
  finalCtaSubline:
    "Run a free scan now. Unlock your report, then wake up to a short list you approve in one tap—so guests find the restaurant you actually run.",
  finalCtaFinePrint: "Free scan · No card · Nothing goes live without you",

  closingSuggestive: "Still guessing what guests see? Start with the free scan—it takes about a minute.",

  cta: {
    aiReport: "Run free scan",
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
    lead: "Clear pricing for busy restaurants.",
    subline: "Two simple plans. No long-term contracts.",
    feeLine: "Start with a free scan—then a daily helper plus credits for website, SEO, and brand requests.",
    closingEyebrow: "Ready when you are",
    closingHeadline: "See the gaps first. Pick a plan when it makes sense.",
  },

  footerTagline:
    "Your restaurant’s daily helper online—scan what guests see, approve the fixes, request the rest with credits.",

  scanning: {
    headline: "Scanning…",
    subline: "Checking what guests see when they find you online—vs strong restaurants nearby.",
    contextLine: "Most guests decide on your website before they visit—we're checking what they see.",
    mapStatus: (name: string) => `Scanning ${name} & competitors`,
    gbpStatus: "Scanning Google Business Profile",
    websiteStatus: (host: string) => `Scanning ${host}`,
    mobileStatus: "Scanning mobile experience",
    reviewsStatus: "Scanning Google Reviews",
  },

  graderPrompts: [
    { label: "How's my Google SEO?", icon: "search" as const },
    { label: "What's broken on my site?", icon: "site" as const },
    { label: "Who's beating me and how?", icon: "crown" as const },
  ] as const,

  graderReport: {
    onlineHealth: "Digital positioning",
  },

  auditScanStages: {
    fetch: "Checking your website",
    render: "Reviewing pages & menus",
    extract: "Pulling photos & reviews",
    score: "Scoring against strong brands",
    benchmark: "Writing your summary",
    done: "Almost ready",
    local: "Checking local visibility",
  },

  auditUnlock: {
    modalTitle: "Unlock your free report",
    modalBody:
      "See scores, photo gaps, and what guests notice—the same issues that put 7 in 10 people off weak sites. Then get a daily list of what to fix.",
    modalSubtitleCompetitors:
      "See why {competitorA} and {competitorB} are beating you on Google.",
    emailLabel: "Work email",
    phoneLabel: "Mobile number",
    submit: "Unlock full report",
    submitting: "Unlocking…",
    legal:
      "By continuing you agree to our Terms of Service and Privacy Policy. We use your details to save your report. Your account is created when you start a paid plan or free trial.",
  },

  auditInsights: [
    {
      quote: `${industryStats.websiteBeforeVisit.value} of guests check your site first—slow pages and weak photos lose them before they book.`,
      tag: "Website",
    },
    {
      quote: `${industryStats.visitForMenu.value} visit mainly to see your menu—if Google can't find it, they go elsewhere.`,
      tag: "Listings",
    },
    {
      quote: `Nearly ${industryStats.deterredByWeakSite.value} are put off by a bad mobile experience before they ever visit.`,
      tag: "Mobile",
    },
  ] as const,

  auditInsightsClosing: "You don’t need a full rebrand—you need to know what to fix first. Start with the free scan.",

  auditUpgrade: {
    headline: "Turn the scan into a daily fix list",
    body: "Your free scan found the gaps. Start your trial for a morning list of what needs doing—one tap to approve.",
    bullets: [
      "Daily tasks from your scan—reviews, holidays, hours, posts",
      "Plain English: what needs doing and why",
      "Approve in one tap—we prepare drafts for you to review",
      "Request website, SEO, or brand work with credits",
      "7-day free trial · cancel anytime",
    ] as const,
  },

  auditReport: {
    dailyHelperLabel: "Your daily helper",
    shareCopied: "Link copied",
    shareFailed: "Could not share — link copied instead",
    unlockNavHint: "Unlock your report to view this section",
  },

  demo: {
    step1Headline: `Tell us about your restaurant—${industryStats.websiteBeforeVisit.value} of guests check you online first`,
    step1Hint: "We'll scan what they see before they visit or book.",
    step2Subline: "Your report shows what's slipping through online.",
    photosFeatureDesc: `Menus with great photos see ${industryStats.menuPhotoOrders.value} more orders—your scan flags photo gaps.`,
  },

  auth: {
    headline: "Your restaurant helper starts here",
    statLine:
      "Most guests decide on your website before they visit. KOB shows you what to fix—then gives you a daily list to approve.",
    bullets: [
      "Free online scan in about a minute",
      "See what guests notice before they book",
      "Daily tasks plus credits for website, SEO, and brand requests",
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
    body: "Add your restaurant—we'll build your daily task list from what guests see online.",
    websiteHint: `${industryStats.websiteBeforeVisit.value} of guests check this before they visit. We'll score it in your first scan.`,
  },

  marqueeQuotes: [
    "Finally a clear list of what to fix—without paying an agency first.",
    "We didn't realise how many guests were judging us online before they booked.",
    "I approve a review reply in the morning and move on with service.",
    "Holiday posts used to slip—we get a reminder and a draft ready.",
    "One place for hours, menu, and reviews beat juggling five apps.",
    "Request the website work with credits—someone actually delivers it.",
  ] as const,

  input: {
    restaurantPlaceholder: "Find your restaurant",
  },

  industryStatsFootnote,
} as const;
