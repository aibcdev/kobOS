export type BenefitTab = {
  id: string;
  label: string;
  headline: string;
  body: string;
  bullets: string[];
  image: string;
  imageAlt: string;
};

export const WEBSITE_SALES_TABS: BenefitTab[] = [
  {
    id: "proven-design",
    label: "Proven layout",
    headline: "Your site should convert—not just look pretty",
    body: "KOB builds pages around how guests actually decide: menu clarity, hours, location, and one obvious way to order or book.",
    bullets: [
      "Hero, menu, and CTA structure tested across hundreds of venues",
      "Mobile-first—most of your traffic is on a phone",
      "Fast loads so guests don't bounce to a competitor",
    ],
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Restaurant website on mobile",
  },
  {
    id: "google-seo",
    label: "Google-ready SEO",
    headline: "Built so Google can find and rank you",
    body: "Structured data, clean headings, and local signals—so you show up when people search near you.",
    bullets: [
      "Schema and meta hygiene handled for you",
      "Local pages for neighbourhood searches",
      "AI audit flags SEO gaps before they cost you bookings",
    ],
    image: "https://images.unsplash.com/photo-1432888622747-4ebee778224b?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Local search results",
  },
  {
    id: "always-improving",
    label: "Keeps improving",
    headline: "Your site learns from what works",
    body: "When we find a better pattern for hospitality sites, your presence gets the update—without a full rebuild.",
    bullets: [
      "Growth Agent weekly priorities",
      "Benchmark against strong brands in your category",
      "Fix list tied to real scan data—not guesswork",
    ],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Analytics dashboard",
  },
];

export const WEBSITE_GROWTH_TABS: BenefitTab[] = [
  {
    id: "ai-seo",
    label: "AI SEO",
    headline: "AI helps you win local search",
    body: "We use AI to spot keyword gaps, weak pages, and listing issues—then tell you exactly what to publish or fix.",
    bullets: ["Visibility audit included", "Competitor comparison in your area", "Action list ranked by impact"],
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=800&q=80",
    imageAlt: "SEO growth chart",
  },
  {
    id: "ordering",
    label: "Online ordering",
    headline: "Ordering built into your site",
    body: "Guests order on your brand—not a marketplace that takes a large cut every time.",
    bullets: ["Pickup, delivery, and dine-in paths", "Clear menus and modifiers", "Works with your existing ops where supported"],
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Mobile food ordering",
  },
  {
    id: "evolving",
    label: "Never static",
    headline: "Always aligned with best practice",
    body: "Hospitality online changes fast. KOB keeps your digital presence current with the patterns that drive direct revenue.",
    bullets: ["Regular template improvements", "Photo and video quality scoring", "Mobile experience monitoring"],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Modern restaurant interior",
  },
];
