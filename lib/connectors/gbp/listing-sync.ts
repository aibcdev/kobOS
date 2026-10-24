import { createHash } from "node:crypto";
import type { TaskCategory } from "@prisma/client";
import { proposeAction } from "@/lib/agent/propose";
import type { PolicyDeps } from "@/lib/agent/policy";
import type { GbpClient } from "@/lib/connectors/gbp/client";
import {
  diffListing,
  fetchWebsiteHours,
  freshnessIssues,
  lastSnapshot,
  readListing,
  sameHours,
  saveSnapshot,
  saveWebsiteHours,
  websiteHours,
  type FreshnessIssue,
  type HoursPeriod,
  type ListingChange,
  type ListingSnapshot,
} from "@/lib/connectors/gbp/listing";
import { prisma } from "@/lib/db/prisma";
import { flag } from "@/lib/flags";

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 12);

export const hoursTaskKey = (location: string, hours: HoursPeriod[]) => `gbp-hours:${location}:${hash(hours)}`;

/**
 * Propose changing the Google hours to `hours`. The owner approves the exact hours; the adapter PATCHes Google and
 * reads them back. The current hours ride along as the undo.
 */
export async function proposeHoursUpdate(
  restaurantId: string,
  location: string,
  current: HoursPeriod[],
  hours: HoursPeriod[],
  opts: { reason: string; requestedByUserId?: string | null; channelOrigin?: "WEB" | "EVENT"; now?: Date; policy?: PolicyDeps },
) {
  return proposeAction(
    {
      restaurantId,
      title: "Update your Google hours",
      summary: opts.reason,
      payload: { actionType: "gbp.hours.regular.update", gbpLocationId: location, periods: hours },
      rollbackPayload: { actionType: "gbp.hours.regular.update", gbpLocationId: location, periods: current },
      taskKey: hoursTaskKey(location, hours),
      channelOrigin: opts.channelOrigin ?? "EVENT",
      requestedByUserId: opts.requestedByUserId ?? null,
      evidence: [{ type: "listing.hours", source: "GBP", sourceId: location, note: opts.reason.slice(0, 280) }],
      window: hash(hours),
      now: opts.now,
    },
    opts.policy,
  );
}

const ISSUE_CATEGORY: Record<FreshnessIssue["key"], TaskCategory> = {
  hours_mismatch: "OPERATIONS",
  photos_stale: "CONTENT",
  no_recent_post: "SOCIAL",
  no_description: "SEO",
};

/** One open task per kind of issue: a repeat check doesn't pile up duplicates. */
async function openIssueTask(restaurantId: string, issue: FreshnessIssue): Promise<boolean> {
  const open = await prisma.chiefOfStaffTask.findFirst({
    where: { restaurantId, status: "PENDING", draftPayload: { path: ["listingIssue"], equals: issue.key } },
    select: { id: true },
  });
  if (open) return false;
  await prisma.chiefOfStaffTask.create({
    data: {
      restaurantId,
      title: issue.title,
      detail: issue.detail,
      category: ISSUE_CATEGORY[issue.key],
      source: "ENGINE",
      requiresIntegration: null,
      draftPayload: { listingIssue: issue.key },
    },
  });
  return true;
}

export type ListingSyncResult = { snapshot: ListingSnapshot; changes: ListingChange[]; issues: FreshnessIssue[]; tasksCreated: number; hoursProposed: boolean };

/** Read the listing, record what changed, check the website, and turn problems into tasks or approvable fixes. */
export async function syncListing(
  restaurantId: string,
  client: GbpClient,
  location: string,
  opts: { now?: Date; fetch?: typeof fetch; policy?: PolicyDeps } = {},
): Promise<ListingSyncResult> {
  const now = opts.now ?? new Date();
  const prev = await lastSnapshot(restaurantId);
  const snapshot = await readListing(client, location, now);
  const changes = diffListing(prev, snapshot);
  await saveSnapshot(restaurantId, snapshot, changes);

  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { website: true } });
  const site = restaurant.website ?? snapshot.websiteUri;
  if (site) {
    const fromSite = await fetchWebsiteHours(site, opts.fetch);
    const known = await websiteHours(restaurantId);
    if (fromSite && (!known || !sameHours(known, fromSite))) await saveWebsiteHours(restaurantId, fromSite, now, "website");
  }

  const issues = freshnessIssues(snapshot, await websiteHours(restaurantId), now);
  let tasksCreated = 0;
  let hoursProposed = false;
  for (const issue of issues) {
    if (issue.key === "hours_mismatch" && issue.proposedHours && (await flag("GBP_LIVE", restaurantId))) {
      const { action } = await proposeHoursUpdate(restaurantId, location, snapshot.hours, issue.proposedHours, { reason: issue.detail, now, policy: opts.policy });
      hoursProposed = action.status === "AWAITING_APPROVAL";
      continue;
    }
    if (await openIssueTask(restaurantId, issue)) tasksCreated++;
  }
  return { snapshot, changes, issues, tasksCreated, hoursProposed };
}
