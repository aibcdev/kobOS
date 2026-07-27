/**
 * Multi-channel follow-up templates (Instagram DM → Facebook Messenger).
 * Always re-use the stored observation — never send identical generic copy.
 */

export type SequenceEmailAngle =
  | "review_response"
  | "inactive_social"
  | "dated_website"
  | "rating_gap"
  | "local_pack"
  | "general";

export type SequenceMessageInput = {
  name: string;
  city: string;
  observation: string;
  emailAngle: string;
};

function cleanObs(obs: string): string {
  return obs.replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

export function normalizeSequenceAngle(raw: string | null | undefined): SequenceEmailAngle {
  const a = (raw || "").trim().toLowerCase();
  if (a === "review_response" || a.includes("review")) return "review_response";
  if (a === "inactive_social" || a.includes("instagram") || a.includes("social")) return "inactive_social";
  if (a === "dated_website" || a.includes("website") || a.includes("dated")) return "dated_website";
  if (a === "rating_gap" || a.includes("rating")) return "rating_gap";
  if (a === "local_pack" || a.includes("local") || a.includes("google")) return "local_pack";
  return "general";
}

/** Instagram DM — short, no link in first touch. */
export function generateInstagramDm(lead: SequenceMessageInput): string {
  const name = lead.name.trim() || "your place";
  const city = lead.city.trim() || "your area";
  const obs = cleanObs(lead.observation) || "a few gaps online when guests decide where to eat";
  const angle = normalizeSequenceAngle(lead.emailAngle);

  switch (angle) {
    case "review_response":
      return `Hey — noticed ${obs} on ${name}.\n\nGuests usually spot that pretty quickly.\n\nWorth sorting, or is someone already handling replies?`;
    case "inactive_social":
      return `Hey — ${obs}.\n\nThe places posting more regularly in ${city} seem to pick up more of the “where shall we eat” traffic.\n\nAre you handling content yourselves at the moment?`;
    case "dated_website":
      return `Hey — had a quick look at ${name}.\n\n${obs}.\n\nIs updating that on the list, or not a priority right now?`;
    case "rating_gap":
      return `Hey — looking at ${name} in ${city}, ${obs}.\n\nThat usually shows up when people are comparing options nearby.\n\nIs reputation something you’re actively working on?`;
    case "local_pack":
      return `Hey — when someone in ${city} searches where to eat, ${obs}.\n\nHappy to share the 3 quickest fixes if useful — no pressure.`;
    default:
      return `Hey — looked at how ${name} shows up when someone in ${city} is deciding where to eat.\n\nBiggest gap right now: ${obs}.\n\nWant me to send the 3 quickest fixes?`;
  }
}

/** Facebook Messenger — slightly more formal / shorter, references prior note. */
export function generateFacebookMsg(lead: SequenceMessageInput): string {
  const name = lead.name.trim() || "your restaurant";
  const obs = cleanObs(lead.observation) || "a couple of online gaps";
  return `Hi — I sent a note the other day about ${obs} at ${name}.\n\nHappy to share the short version if useful. No problem either way.`;
}

export function instagramHandleFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = u.pathname.split("/").filter(Boolean);
    const handle = parts[0]?.replace(/^@/, "") || null;
    if (!handle || handle === "p" || handle === "reel" || handle === "stories") return null;
    return handle.slice(0, 64);
  } catch {
    const m = url.match(/instagram\.com\/(@?[\w.]+)/i);
    return m?.[1]?.replace(/^@/, "") ?? null;
  }
}

/** Drop Facebook pixel / share junk — keep real page URLs only. */
export function cleanFacebookPageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  if (/facebook\.com\/tr\b/i.test(raw)) return null;
  if (/facebook\.com\/photo/i.test(raw)) return null;
  if (/facebook\.com\/sharer/i.test(raw)) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/facebook\.com$/i.test(u.hostname.replace(/^www\./, "")) && !/\.facebook\.com$/i.test(u.hostname)) {
      return null;
    }
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}
