export type JobKey =
  | "reviews"
  | "google"
  | "website"
  | "kitchen"
  | "reservations"
  | "marketing"
  | "events"
  | "reporting";

export type FindingStatus = "done" | "needs" | "alert" | "up";

export type FindingArea =
  | "google"
  | "reviews"
  | "website"
  | "reservations"
  | "reputation"
  | "social"
  | "competition";

export type Restaurant = {
  id: string
  name: string
  area: string
  city: string
  cuisine: string
  rating: number
  reviewCount: number
  priceLevel: "£" | "££" | "£££"
  hoursGoogle: string
  hoursWebsite: string
  website: string
  phone: string
  address: string
  bookingUrl?: string
  ownerFirstName: string
  monthlyGoogleViews: number
  covers: string
};

export type Finding = {
  id: string
  area: FindingArea
  ruleId?: string
  status: FindingStatus
  headline: string
  detail: string
  actionLabel?: string
  estimatedMin?: number
  approval: "ask" | "auto"
};

export type Review = {
  id: string
  author: string
  rating: number
  text: string
  when: string
  reply?: string
  status: "replied" | "draft" | "escalate"
  draft?: string
};

export type ChatRole = "owner" | "kob" | "done";

export type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  actions?: { id: string; label: string; kind: "approve" | "ignore" | "yes" | "remember" | "handle" }[]
  doneText?: string
};

export type MemoryItem = {
  id: string
  text: string
  learned: string
};

export type AutonomyLevel = "ask" | "handle" | "always-ask";

export type AutonomyRule = {
  id: string
  label: string
  detail: string
  level: AutonomyLevel
  suggest: string
  autopilot: string
  never: string
};

export const AUTONOMY_STAGES = [
  {
    id: "suggest" as const,
    name: "Suggest",
    level: "ask" as AutonomyLevel,
    owner: "Check the hours before we open.",
    kob: "Google says you close at 4pm. The website says 5pm.\nI can set both to 5pm. Nothing goes live until you say so.",
    action: "Fix hours",
  },
  {
    id: "approve" as const,
    name: "Approve",
    level: "ask" as AutonomyLevel,
    owner: "Always let KOB answer 4 and 5 star reviews.",
    kob: "I'll reply in your usual tone.\nComplaints, refunds and prices still come to you.",
    action: "Handle 4–5 star reviews",
  },
  {
    id: "autopilot" as const,
    name: "Autopilot",
    level: "handle" as AutonomyLevel,
    owner: "How were overnight reviews?",
    kob: "Two 5-star reviews came in after close. I replied.\nOne guest complained about a wait — that stays with you. I have not offered a voucher.",
    action: undefined,
  },
];

export const DEMO_RESTAURANTS: Restaurant[] = [
  {
    id: "langosteria-london",
    name: "Langosteria",
    area: "Dover Street",
    city: "London",
    cuisine: "Italian fine dining",
    rating: 4.6,
    reviewCount: 890,
    priceLevel: "£££",
    hoursGoogle: "Sun closed · Mon–Thu 12pm–10.30pm · Fri–Sat 12pm–11.30pm",
    hoursWebsite: "Sun closed · Mon–Thu 12pm–11pm · Fri–Sat 12pm–12am",
    website: "langosteria.com",
    phone: "020 7499 8558",
    address: "8–10 Dover Street, London W1S 4LQ",
    ownerFirstName: "Enrico",
    monthlyGoogleViews: 4200,
    covers: "Dining room · London*",
  },
  {
    id: "camberwell",
    name: "The Camberwell Arms",
    area: "Camberwell",
    city: "London",
    cuisine: "Seasonal British",
    rating: 4.5,
    reviewCount: 1157,
    priceLevel: "£££",
    hoursGoogle:
      "Sun 1pm–6pm · Mon 5pm–11pm · Tue–Thu 12pm–11pm · Fri–Sat 12pm–11.30pm",
    hoursWebsite: "Hours not listed on the site",
    website: "thecamberwellarms.co.uk",
    phone: "020 7358 4364",
    address: "65 Camberwell Church Street, London SE5 8TR",
    ownerFirstName: "Michael",
    monthlyGoogleViews: 0,
    covers: "Dining room and upstairs",
  },
  {
    id: "mill",
    name: "The Mill Café",
    area: "East Dulwich",
    city: "London",
    cuisine: "All-day café",
    rating: 4.6,
    reviewCount: 318,
    priceLevel: "££",
    hoursGoogle: "Mon–Sat 8am–4pm · Sun 9am–3pm",
    hoursWebsite: "Mon–Sat 8am–5pm · Sun 9am–5pm",
    website: "themillcafe.example",
    phone: "020 8693 4410",
    address: "42 Lordship Lane, London SE22",
    bookingUrl: "themillcafe.example/book",
    ownerFirstName: "Sarah",
    monthlyGoogleViews: 480,
    covers: "38 covers",
  },
  {
    id: "harbour",
    name: "Harbour & Rye",
    area: "The Lanes",
    city: "Brighton",
    cuisine: "Neighbourhood bistro",
    rating: 4.7,
    reviewCount: 512,
    priceLevel: "£££",
    hoursGoogle: "Tue–Sun 12pm–10pm · Closed Mon",
    hoursWebsite: "Tue–Sun 12pm–10pm · Closed Mon",
    website: "harbourandrye.example",
    phone: "01273 608 221",
    address: "18 Meeting House Lane, Brighton",
    bookingUrl: "resy.com/harbour-rye",
    ownerFirstName: "James",
    monthlyGoogleViews: 1260,
    covers: "52 covers",
  },
  {
    id: "ember",
    name: "Ember & Ash",
    area: "Stockbridge",
    city: "Edinburgh",
    cuisine: "Wood-fired",
    rating: 4.5,
    reviewCount: 241,
    priceLevel: "££",
    hoursGoogle: "Wed–Sun 5pm–11pm",
    hoursWebsite: "Wed–Sun 5pm–10.30pm",
    website: "emberandash.example",
    phone: "0131 332 9088",
    address: "7 St Stephen Street, Edinburgh",
    ownerFirstName: "Amina",
    monthlyGoogleViews: 640,
    covers: "44 covers",
  },
  {
    id: "stjohns",
    name: "St John's Table",
    area: "Redland",
    city: "Bristol",
    cuisine: "Seasonal British",
    rating: 4.8,
    reviewCount: 189,
    priceLevel: "£££",
    hoursGoogle: "Thu–Sat 6pm–10pm · Sun 12pm–3pm",
    hoursWebsite: "Thu–Sat 6pm–10pm · Sun 12pm–3.30pm",
    website: "stjohnstable.example",
    phone: "0117 973 4402",
    address: "21 St John's Road, Bristol",
    bookingUrl: "stjohnstable.example/reserve",
    ownerFirstName: "Eliot",
    monthlyGoogleViews: 390,
    covers: "28 covers",
  },
  {
    id: "local",
    name: "The Local Kitchen",
    area: "Ancoats",
    city: "Manchester",
    cuisine: "All-day kitchen",
    rating: 4.4,
    reviewCount: 427,
    priceLevel: "££",
    hoursGoogle: "Daily 9am–9pm",
    hoursWebsite: "Daily 9am–10pm",
    website: "thelocalkitchen.example",
    phone: "0161 236 1180",
    address: "4 Blossom Street, Manchester",
    bookingUrl: "opentable.com/the-local-kitchen",
    ownerFirstName: "Akeem",
    monthlyGoogleViews: 890,
    covers: "60 covers",
  },
  {
    id: "olive",
    name: "Olive & Grain",
    area: "Jericho",
    city: "Oxford",
    cuisine: "Wine bar & plates",
    rating: 4.6,
    reviewCount: 156,
    priceLevel: "££",
    hoursGoogle: "Tue–Sat 12pm–11pm · Sun 12pm–4pm",
    hoursWebsite: "Tue–Sat 12pm–11pm · Sun 12pm–4pm",
    website: "oliveandgrain.example",
    phone: "01865 511 204",
    address: "9 Walton Street, Oxford",
    ownerFirstName: "Maya",
    monthlyGoogleViews: 310,
    covers: "32 covers",
  },
];

export const HERO_PROMPTS = [
  "Reply to yesterday's reviews.",
  "We're closed next Monday.",
  "Never discount Friday nights.",
  "Always handle 5-star reviews.",
  "Update the website menu.",
  "Why are Tuesdays quiet?",
];

export type JobDemo = {
  key: JobKey
  label: string
  live: boolean
  owner: string
  kob: string
  actions?: string[]
  follow?: string
  flow: {
    from: "guest" | "kob" | "done" | "call"
    text: string
    who?: string
  }[]
};

export const JOBS: JobDemo[] = [
  {
    key: "reviews",
    label: "Reviews",
    live: true,
    owner: "How were yesterday's reviews?",
    kob: "You received 7 reviews yesterday.\n6 were positive and I've replied in your usual tone.\nOne guest complained about a 40-minute wait. Similar comments appeared twice this month, so I've left this one for you to review.",
    actions: ["Approve response"],
    flow: [
      { from: "guest", who: "Priya", text: "Came back for the third time. Still the reason we cross town." },
      { from: "kob", text: "Replied in your usual tone." },
      { from: "done", text: "Sent" },
      { from: "guest", who: "Elena", text: "Food was good but we waited forty minutes for mains." },
      { from: "kob", text: "Left for you. Similar comments twice this month — no voucher offered." },
    ],
  },
  {
    key: "google",
    label: "Google",
    live: true,
    owner: "Is the listing still accurate?",
    kob: "Your Google listing says you close at 4pm today. Your website says 5pm.\nAround 480 people viewed the profile last month — this is the kind of mismatch that sends people away.\nI can set both to 5pm now.",
    actions: ["Fix hours", "Leave it"],
    flow: [
      { from: "kob", text: "Google says you close at 4pm. The website says 5pm." },
      { from: "guest", who: "You", text: "Set both to 5pm." },
      { from: "kob", text: "Hours prepared for Google and the site." },
      { from: "done", text: "Listing matches" },
    ],
  },
  {
    key: "website",
    label: "Website",
    live: true,
    owner: "Check the site before service.",
    kob: "The brunch menu on the website still shows last season's price for the smashed eggs.\nGoogle and the printed menu already have the new one. I can queue the website change.",
    actions: ["Queue the fix"],
    flow: [
      { from: "guest", who: "Chris", text: "Great brunch. Website still has the old price on the smashed eggs." },
      { from: "kob", text: "Printed menu is right. Queuing the website change." },
      { from: "done", text: "Menu change queued" },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen",
    live: true,
    owner: "Check the delivery and the waste.",
    kob: "Cape Dairy charged more than the house rate on cheddar. Quiet Tuesday plus rain: I can cut salad prep. Sunday: salmon in vs dishes out — a gap. Nothing goes to the chef or the supplier until you say so.",
    actions: ["Draft supplier note", "Leave it"],
    flow: [
      { from: "guest", who: "Chef", text: "Delivery photo. Cheddar line looks high." },
      { from: "kob", text: "House rate is lower. I can draft the supplier note — or leave it." },
      { from: "kob", text: "Forecast 12°C. Salad usually drops on cold Tuesdays. Cut prep, or dismiss." },
      { from: "done", text: "Waiting on you" },
    ],
  },
  {
    key: "reservations",
    label: "Reservations",
    live: false,
    owner: "Someone wants to book a party of 18 next month. Handle it.",
    kob: "I've taken the enquiry for Saturday 18 October.\nYour dining room holds 16 comfortably; 18 needs the private room or a long table on the garden side.\nI'll send them both options, the set menu, and a hold until Friday — unless you'd rather take this one.",
    actions: ["Send options"],
    flow: [
      { from: "guest", who: "Alex", text: "Can you take 18 on Saturday 18 October?" },
      { from: "kob", text: "Dining room holds 16. Sending the private room and the garden table, plus the set menu." },
      { from: "call", text: "Hold sent until Friday" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    live: false,
    owner: "Promote the new lunch menu this week.",
    kob: "You're 23% behind a typical Thursday lunch.\nI drafted a note for previous Thursday guests, a Google post, and a short Instagram caption using tonight's special — not a generic offer.\nNothing goes live until you say so.",
    actions: ["Show me the draft"],
    flow: [
      { from: "kob", text: "Thursday lunch is behind. Drafted a note for previous Thursday guests and a Google post with tonight's special." },
      { from: "guest", who: "You", text: "Show me first." },
      { from: "kob", text: "Nothing goes live until you say so." },
    ],
  },
  {
    key: "events",
    label: "Private events",
    live: false,
    owner: "We had three missed calls about Christmas parties.",
    kob: "I logged all three.\nTwo want 12–16 covers in early December. One asked about the whole restaurant on a Monday.\nI've prepared holding replies and a simple availability note. Want me to send them?",
    actions: ["Send holding replies"],
    flow: [
      { from: "call", text: "Three missed calls about Christmas parties" },
      { from: "kob", text: "Two want 12–16 covers. One asked about the whole restaurant on a Monday." },
      { from: "done", text: "Holding replies ready" },
    ],
  },
  {
    key: "reporting",
    label: "Reporting",
    live: true,
    owner: "Why are Tuesdays quiet?",
    kob: "Tuesdays have been 31% below the rest of the week for six weeks.\nReviews don't mention it — the listing simply doesn't show a reason to come.\nI can put a set-menu post on Google and email last month's Tuesday guests. Or we leave Tuesdays alone.",
    actions: ["Prepare something"],
    flow: [
      { from: "guest", who: "You", text: "Why are Tuesdays quiet?" },
      { from: "kob", text: "Six weeks of soft Tuesdays. The listing doesn't give a reason to come." },
      { from: "kob", text: "I can post a set menu — or we leave Tuesdays alone." },
    ],
  },
];
