import type { Restaurant, Finding } from "@/lib/kob/demo-data";
import type { OnboardProfile } from "@/lib/kob/onboard-profile";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "room";
}

export function restaurantFromOnboard(profile: OnboardProfile): Restaurant {
  const slug = slugify(profile.name);
  const website =
    profile.website?.replace(/^https?:\/\//i, "").replace(/\/$/, "") ??
    `${slug}.example`;

  return {
    id: profile.placeId ? `place-${profile.placeId.slice(0, 24)}` : `custom-${slug}`,
    name: profile.name,
    area: profile.area || profile.city,
    city: profile.city,
    cuisine: profile.cuisine,
    rating: profile.rating ?? 4.2,
    reviewCount: profile.reviewCount ?? 0,
    priceLevel: (profile.reviewCount ?? 0) >= 200 ? "£££" : "££",
    hoursGoogle: "From Google listing",
    hoursWebsite: profile.website ? "Check vs Google" : "Not on website",
    website,
    phone: profile.phone ?? "",
    address: profile.address || `${profile.area}, ${profile.city}`,
    ownerFirstName: profile.role === "owner" ? "there" : profile.roleLabel.split(" ")[0] ?? "there",
    monthlyGoogleViews: Math.max(120, Math.round((profile.reviewCount ?? 40) * 2.2)),
    covers: `~${profile.staffEstimate.range} team`,
  };
}

/** Extra findings KOB surfaces from the smart onboard pass. */
export function findingsFromOnboard(profile: OnboardProfile): Finding[] {
  const items: Finding[] = [
    {
      id: "onboard-google",
      area: "google",
      status: profile.rating && profile.rating >= 4.2 ? "up" : "needs",
      headline: profile.googlePerformance.scoreLabel + " on Google",
      detail: profile.googlePerformance.summary,
      approval: "ask",
    },
    {
      id: "onboard-popularity",
      area: "competition",
      status: profile.popularity.rankHint.includes("Quieter") ? "alert" : "up",
      headline: profile.popularity.rankHint,
      detail: profile.popularity.summary,
      approval: "ask",
    },
    {
      id: "onboard-issue",
      area: profile.biggestIssue.id === "food_waste" ? "social" : "reputation",
      status: "needs",
      headline: `Likely focus: ${profile.biggestIssue.label}`,
      detail: profile.biggestIssue.why,
      approval: "ask",
    },
  ];

  if (!profile.websiteView.hasSite) {
    items.push({
      id: "onboard-site",
      area: "website",
      status: "alert",
      headline: "No website on the listing",
      detail: profile.websiteView.summary,
      approval: "ask",
    });
  }

  return items;
}
