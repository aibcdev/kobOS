export const EXAMPLE_BRAND = {
  id: "langosteria-london",
  name: "Langosteria",
  locationLabel: "London*",
  area: "Dover Street",
  city: "London",
  since: "2013",
  address: "8–10 Dover Street, London W1S 4LQ",
  website: "langosteria.com",
  logoSrc: "/brands/langosteria-wordmark.svg",
  disclaimer: "* Examples only. Not affiliated with the brands shown.",
};

/** Jobs KOB prepares — shown on the homepage proof. */
export const KOB_JOBS = [
  {
    title: "Hours & listings",
    body: "Aligns Google, the website, and booking pages when they disagree. Nothing publishes until you say yes.",
  },
  {
    title: "Reviews",
    body: "Drafts replies in your tone. Five-stars can go on rules you set. Complaints stay with you.",
  },
  {
    title: "Food waste & invoices",
    body: "Snap a delivery note. KOB checks house rate vs the line, flags waste vs covers, and drafts a supplier note — approve only.",
  },
  {
    title: "Weather prep",
    body: "When rain or cold will hit covers, KOB suggests prep cuts so the kitchen does not overcook.",
  },
  {
    title: "Google watch",
    body: "Watches public hours, rating, and review count every morning. You talk. He takes the job.",
  },
] as const;

export const CORE_BENEFITS = [
  {
    title: "You talk. He takes the job.",
    body: "Hours, reviews, Google, the site, food waste, and kitchen jobs — prepared in the tools you already use.",
  },
  {
    title: "Nothing public without you.",
    body: "Approve-only. Drafts wait. No surprise posts, no silent supplier notes.",
  },
  {
    title: "Kitchen, not just the listing.",
    body: "Invoice photos, house rate, waste vs dishes sold, weather prep. Same Talk thread as hours and reviews.",
  },
  {
    title: "Not a dashboard.",
    body: "KOB is an employee who uses your tools. Free tools first. Paid partners later.",
  },
] as const;

export const PROOF_CASE = {
  date: "Example design",
  restaurantId: "langosteria-london",
  name: EXAMPLE_BRAND.name,
  area: EXAMPLE_BRAND.area,
  city: EXAMPLE_BRAND.city,
  since: EXAMPLE_BRAND.since,
  address: EXAMPLE_BRAND.address,
  website: EXAMPLE_BRAND.website,
  logoSrc: EXAMPLE_BRAND.logoSrc,
  locationLabel: EXAMPLE_BRAND.locationLabel,
  note: "Hours, reviews, Google, the site, invoice waste flags, and weather prep — each job waits for your yes.",
  disclaimer: EXAMPLE_BRAND.disclaimer,
  sources: [
    {
      name: "langosteria.com",
      when: "Example",
      sunday: "Closed",
      monday: "12pm–11pm",
      friday: "12pm–12am",
    },
    {
      name: "Google listing",
      when: "Example",
      sunday: "Closed",
      monday: "12pm–10.30pm",
      friday: "12pm–11.30pm",
    },
    {
      name: "Booking page",
      when: "Example",
      sunday: "Closed",
      monday: "12.30pm–11pm",
      friday: "12pm–12am",
    },
    {
      name: "Directory",
      when: "Example",
      sunday: "1pm–10pm",
      monday: "Closed",
      friday: "12pm–11pm",
    },
  ],
  before: [
    {
      title: "Hours drift",
      body: "Four public sources, four Fridays. The guest cannot tell which door is true.",
    },
    {
      title: "Food waste blind",
      body: "Delivery notes sit in a drawer. Nobody checks house rate vs the line before prep overshoots.",
    },
    {
      title: "Reviews & listing",
      body: "Replies wait. Google and the site disagree. Nobody owns the morning pass.",
    },
  ],
  after: [
    {
      title: "One hours sheet",
      body: "KOB drafts one set for Google, the site, and bookings. Nothing publishes until you say yes.",
    },
    {
      title: "Waste on the desk",
      body: "Invoice photo in. House rate vs line, waste vs covers flagged. Draft supplier note — or leave it.",
    },
    {
      title: "Talk to approve",
      body: "Apply hours / Leave it. Same for reviews and kitchen. Truth log only stores what you approved.",
    },
  ],
};

export const PRICING = [
  {
    id: "founding",
    name: "Founding",
    price: "£99",
    period: "per location / month",
    note: "For the first restaurants on KOB.",
    featured: true,
    items: [
      "KOB Daily Manager",
      "Reviews and Google",
      "Website watching",
      "Invoice photo & waste flags",
      "Morning brief on WhatsApp or email",
      "Suggest → approve on every public change",
      "14-day trial",
    ],
  },
  {
    id: "kob",
    name: "KOB",
    price: "£149",
    period: "per location / month",
    note: "The restaurant's digital assistant manager.",
    featured: false,
    items: [
      "Everything in Founding",
      "KOB memory and tone",
      "Autonomy rules you control",
      "Weekly opportunity notes",
      "Website and listing monitoring",
    ],
  },
  {
    id: "pro",
    name: "KOB Pro",
    price: "£299",
    period: "per location / month",
    note: "When KOB starts taking guests and the phone.",
    featured: false,
    items: [
      "Everything in KOB",
      "Takes reservation enquiries",
      "AI phone allowance",
      "Private events and missed calls",
      "Advanced integrations",
    ],
  },
];
