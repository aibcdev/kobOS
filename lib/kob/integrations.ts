export type ToolId =
  | "google"
  | "website"
  | "pos"
  | "bookings"
  | "delivery"
  | "weather"
  | "whatsapp"
  | "email"
  | "accounting";

export type Tool = {
  id: ToolId
  name: string
  does: string
  connect: string
  vendors: string[]
  group: "Front of house" | "Kitchen & money" | "Reach guests"
  /** Live without a paid vendor deal. */
  free: boolean
  soonNote?: string
};

/** Restaurant tools. Free ones work now; paid ones show Soon. */
export const TOOLS: Tool[] = [
  {
    id: "google",
    name: "Google listing",
    does: "Watch public hours, rating, and review count. Full GBP edit needs Google login later.",
    connect: "Watch Google",
    vendors: ["Google Business (public)"],
    group: "Front of house",
    free: true,
  },
  {
    id: "website",
    name: "Website",
    does: "Point KOB at your site URL. Hours and menu checks.",
    connect: "Save site URL",
    vendors: ["Any public site"],
    group: "Front of house",
    free: true,
  },
  {
    id: "bookings",
    name: "Reservations",
    does: "Closed days stay true on the booker.",
    connect: "Connect bookings",
    vendors: ["OpenTable", "Resy", "SevenRooms"],
    group: "Front of house",
    free: false,
    soonNote: "Partner login — soon",
  },
  {
    id: "pos",
    name: "Till / POS",
    does: "Dish counts for waste. Read only. We do not replace your till.",
    connect: "Connect the till",
    vendors: ["Lightspeed", "Square", "Toast", "Pilot", "Orderly"],
    group: "Kitchen & money",
    free: false,
    soonNote: "Partner login — soon",
  },
  {
    id: "accounting",
    name: "Invoice photo",
    does: "Snap a delivery note. KOB reads lines and checks house rate. Free now.",
    connect: "Enable invoice photos",
    vendors: ["Camera / upload"],
    group: "Kitchen & money",
    free: true,
  },
  {
    id: "weather",
    name: "Weather",
    does: "Prep when rain or cold will hit covers. Free OpenWeather.",
    connect: "Turn on weather",
    vendors: ["OpenWeather free"],
    group: "Kitchen & money",
    free: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    does: "Talk and approve from the phone.",
    connect: "Connect WhatsApp",
    vendors: ["WhatsApp Business"],
    group: "Reach guests",
    free: false,
    soonNote: "Meta Business — soon",
  },
  {
    id: "email",
    name: "Email brief",
    does: "Save the address for morning briefs. Free.",
    connect: "Save email",
    vendors: ["Any inbox"],
    group: "Reach guests",
    free: true,
  },
  {
    id: "delivery",
    name: "Delivery apps",
    does: "Watch menu price drift vs your site.",
    connect: "Connect delivery",
    vendors: ["Uber Eats", "Deliveroo", "DoorDash", "Mr D"],
    group: "Reach guests",
    free: false,
    soonNote: "Partner login — soon",
  },
];

export const EMPTY_TOOLS: Record<ToolId, boolean> = {
  google: false,
  website: false,
  pos: false,
  bookings: false,
  delivery: false,
  weather: false,
  whatsapp: false,
  email: false,
  accounting: false,
};

export const TOOL_GROUPS = [
  "Front of house",
  "Kitchen & money",
  "Reach guests",
] as const;

export function toolNeededFor(text: string): ToolId | null {
  const q = text.toLowerCase();
  if (/margin|profit|food cost|gp\b|gross profit/.test(q)) return "accounting";
  if (/\binvoice\b|delivery note|photo/.test(q)) return "accounting";
  if (/\bwaste\b|leakage|\btill\b|\bpos\b|lightspeed|orderly|square|toast/.test(q)) {
    return "pos";
  }
  if (/\bxero\b|quickbooks|sage/.test(q)) return "accounting";
  if (/\bweather\b|\brain\b|forecast|\bstorm\b/.test(q)) return "weather";
  if (/\bopentable\b|\bresy\b|sevenrooms|reservation/.test(q)) return "bookings";
  if (/uber eats|deliveroo|doordash|mr d\b/.test(q)) return "delivery";
  if (/\bmenu\b|website|\bthe site\b|http/.test(q)) return "website";
  if (/\breviews?\b|\bgoogle\b|\blisting\b|\bhours\b|closed monday|bank holiday/.test(q)) {
    return "google";
  }
  if (/whatsapp/.test(q)) return "whatsapp";
  if (/\bemail\b|gmail|outlook|morning brief/.test(q)) return "email";
  return null;
}
