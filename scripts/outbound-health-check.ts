/**
 * Per-prospect Google health check + problem-hook email drafts, for Tim to review and send by hand. Sends nothing.
 *
 *   npm run outbound:health-check -- --name "Osteria Lume" --city London
 *   npm run outbound:health-check -- --place ChIJ... --unanswered 4 --hours-mismatch "Google 10pm, site 11pm" --first-name Sam
 *
 * First run without --unanswered: the output lists what to check by hand on Google Maps. Run again with the counts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { placesFindByNameAndCity, placesHealthCheckFields } from "../lib/places/google-places-server";
import { healthCheckMarkdown, manualChecklist, PRICE_REPLY, problemHookSequence, type ManualChecks } from "../lib/outbound/health-check";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  let placeId = arg("place");
  const name = arg("name");
  if (!placeId && name) placeId = (await placesFindByNameAndCity(name, arg("city")))?.placeId;
  if (!placeId) throw new Error('Pass --place <placeId> or --name "Restaurant" [--city City]. Needs GOOGLE_PLACES_API_KEY.');

  const facts = await placesHealthCheckFields(placeId);
  if (!facts) throw new Error(`Google returned nothing for ${placeId}.`);

  const unanswered = arg("unanswered");
  const manual: ManualChecks = {
    unansweredRecent: unanswered != null ? Number(unanswered) : undefined,
    hoursMismatch: arg("hours-mismatch"),
    firstName: arg("first-name"),
  };
  const sequence = problemHookSequence(facts, manual, process.env.OUTBOUND_SENDER_NAME?.trim() || "Tim");

  const out = [
    healthCheckMarkdown(facts, manual),
    "",
    "---",
    "# For Tim (not for the prospect)",
    "## Check by hand first",
    ...manualChecklist(facts).map((s) => `- ${s}`),
    "",
    "## Email drafts",
    ...(sequence
      ? sequence.flatMap((d) => [`### Step ${d.step} (day ${d.sendAfterDays}): ${d.subject}`, `_${d.note}_`, "", "```", d.body, "```", ""])
      : ["No real problem to lead with yet. Do the by-hand checks; if there's still nothing, don't send."]),
    "## If they ask about price",
    PRICE_REPLY,
  ].join("\n");

  const dir = path.join(process.cwd(), "tmp", "health-checks");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${(facts.name || placeId).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
  writeFileSync(file, out);
  console.log(out);
  console.log(`\nSaved ${file}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
