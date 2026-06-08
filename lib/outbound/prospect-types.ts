/** Real venue from Google Places — used as input to outbound copy generation. */
export type OutboundProspect = {
  placeId: string;
  name: string;
  formattedAddress: string;
  websiteUrl: string | null;
  rating: number | null;
  userRatingCount: number | null;
};

export type UkColdQualifiedProspect = OutboundProspect & {
  qualifyScore: number;
  topIssue: string;
  contactEmail: string;
  enrichmentSource: "hunter" | "scrape";
};
