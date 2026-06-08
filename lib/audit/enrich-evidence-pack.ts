import type { AuditGooglePlaceEvidence } from "@/lib/audit/evidence-pack";
import type { AuditStagehandExtraction } from "@/lib/browserbase/stagehand-schema";
import { placesPlaceAuditEnrichment } from "@/lib/places/google-places-server";

export async function enrichEvidencePackV2(input: {
  placeId?: string | null;
  stagehandExtraction?: AuditStagehandExtraction | null;
}): Promise<{
  googlePlace?: AuditGooglePlaceEvidence;
  stagehandExtraction?: AuditStagehandExtraction;
}> {
  const out: {
    googlePlace?: AuditGooglePlaceEvidence;
    stagehandExtraction?: AuditStagehandExtraction;
  } = {};

  if (input.placeId?.trim()) {
    const googlePlace = await placesPlaceAuditEnrichment(input.placeId.trim());
    if (googlePlace) out.googlePlace = googlePlace;
  }

  if (input.stagehandExtraction) {
    out.stagehandExtraction = input.stagehandExtraction;
  }

  return out;
}

export function applyEvidencePackV2Fields<
  T extends {
    version: 1 | 2;
    googlePlace?: AuditGooglePlaceEvidence;
    stagehandExtraction?: AuditStagehandExtraction;
  },
>(pack: T, extras: Awaited<ReturnType<typeof enrichEvidencePackV2>>): T {
  if (!extras.googlePlace && !extras.stagehandExtraction) return pack;
  return {
    ...pack,
    version: 2,
    ...(extras.googlePlace ? { googlePlace: extras.googlePlace } : {}),
    ...(extras.stagehandExtraction ? { stagehandExtraction: extras.stagehandExtraction } : {}),
  };
}
