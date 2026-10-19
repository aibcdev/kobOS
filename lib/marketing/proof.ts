export type MarketingProof = {
  name: string;
  venue: string;
  city: string;
  quote: string;
  consent: true;
};

/** Named quotes only. Empty until a real customer has given consent. */
export const MARKETING_PROOF: MarketingProof[] = [];

export function consentedProof(): MarketingProof[] {
  return MARKETING_PROOF.filter(
    (entry) => entry.consent && entry.name && entry.venue && entry.city && entry.quote,
  );
}

/** Off until the 180-site wording is confirmed. Never say "in use". */
export function show180SiteProof(): boolean {
  return process.env.MARKETING_PROOF_180 === "true";
}
