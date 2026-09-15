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

export const CORE_BENEFITS = [
  {
    title: "You talk. He takes the job.",
    body: "Hours, reviews, Google, the site, and kitchen jobs — prepared in the tools you already use.",
  },
  {
    title: "Nothing public without you.",
    body: "Approve-only. Drafts wait. No surprise posts, no silent supplier notes.",
  },
  {
    title: "Not a dashboard.",
    body: "KOB is an employee who uses your tools. Free tools first. Paid partners later.",
  },
  {
    title: "Multi-site ready.",
    body: "Same house rules across rooms. One Talk thread. You stay in charge.",
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
  note: "Sample hours drift a guest might see across public sources — prepared as an example for how KOB works.",
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
      title: "Hours",
      body: "Four public sources, four Fridays. The guest cannot tell which door is true.",
    },
    {
      title: "Listing vs site",
      body: "Google and the website disagree on Monday close. Nobody owns the correction.",
    },
    {
      title: "Multi-site drift",
      body: "London* hours should match the house sheet. Other rooms stay on their own clocks.",
    },
  ],
  after: [
    {
      title: "One hours sheet",
      body: "KOB drafts one set for Google, the site, and bookings. Nothing publishes until you say yes.",
    },
    {
      title: "Talk to approve",
      body: "You get Apply hours / Leave it in Talk — same flow on the phone later.",
    },
    {
      title: "Truth log",
      body: "Only approved jobs land in the log. No invented savings.",
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
