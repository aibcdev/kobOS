/**
 * KOB public marketing copy — visibility audit → fix list → growth platform.
 */
export const marketingCopy = {
  trustLine: "Trusted by over 500 retailers, restaurants and markets worldwide",
  trustLineShort: "Trusted by 500+ restaurants & markets",

  heroHeadline: "See what's holding your restaurant back online.",
  heroSubline: "Run a free AI scan. Get scores, fixes, and a clear plan—before you spend on ads or redesigns.",
  /** Split headline (line 1 + line 2) for hero and legacy pages */
  losingSalesOnline: "See what's holding your restaurant back online.",
  useAiToFix: " Run a free AI scan to fix it first.",

  auditSubline:
    "KOB scans your website, Google presence, photos, and reviews—then ranks what to fix first. About a minute. No card.",
  productSubline:
    "Websites, SEO, ordering, and marketing for hospitality—plus an AI report that shows what to fix before you spend.",

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
    headline: "Building your AI report…",
    subline: "Scoring website, Google, photos, and reviews against what strong brands do.",
    mapStatus: (name: string) => `Scanning ${name} & competitors`,
    gbpStatus: "Scanning Google Business Profile",
    websiteStatus: (host: string) => `Scanning ${host}`,
    mobileStatus: "Scanning mobile experience",
    reviewsStatus: "Scanning Google Reviews",
  },

  graderReport: {
    onlineHealth: "Online visibility",
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
      "Enter your email and mobile to see scores, fixes, competitors, and your 30/60/90 plan. Then start your free trial in the dashboard—no sales call.",
    modalSubtitleCompetitors:
      "See why {competitorA} and {competitorB} are beating you on Google.",
    emailLabel: "Work email",
    phoneLabel: "Mobile number",
    submit: "Unlock full report",
    submitting: "Unlocking…",
    legal:
      "By continuing you agree to our Terms of Service and Privacy Policy. We use your details to save your report and set up your account.",
  },

  input: {
    restaurantPlaceholder: "Find your restaurant name",
  },

  auth: {
    signInTitle: "Welcome back",
    signUpTitle: "Create your account",
    signInBlurb: "We'll email you a secure sign-in link.",
    signUpBlurb: "No password needed. First time here? We create your workspace when you confirm your email.",
    emailLabel: "Work email",
    submitSignIn: "Send sign-in link",
    submitSignUp: "Create account",
    sent: "Check your email for the magic link.",
  },
} as const;
