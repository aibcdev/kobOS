import { PEER_TARGET_COUNT, selectPeerRestaurants } from "@/lib/audit/select-peer-restaurants";
import type { AuditResultPayload } from "@/lib/audit/types";

/**
 * Re-pick the local peers once the subject's own score is final.
 *
 * The point of the peer block is "these local restaurants are ahead of you", so the
 * bar depends on the subject's score, which is only known after scoring. Runs after
 * finalizeAuditScores; safe to run repeatedly.
 */
export async function applyPeerRestaurantsToPayload(
  payload: AuditResultPayload,
): Promise<AuditResultPayload> {
  const subjectScore = payload.restaurantScores?.overall ?? payload.scores.overall ?? null;
  const geo = payload.geoLocation;
  const pack = payload.evidencePack;
  const city = geo?.city?.trim() || pack?.city?.trim() || "";
  if (!city || city === "Your area") return payload;

  const alreadyAhead = payload.competitors.filter(
    (c) => c.scoreMeasured && subjectScore != null && c.mockScore >= subjectScore,
  ).length;
  if (alreadyAhead >= PEER_TARGET_COUNT) return payload;

  try {
    const peers = await selectPeerRestaurants({
      city,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      excludeName: pack?.restaurantName ?? "",
      subjectScore,
    });
    if (peers.length === 0) return payload;
    return { ...payload, competitors: peers };
  } catch (e) {
    console.warn("[audit/peers] re-selection failed", e);
    return payload;
  }
}
