#!/usr/bin/env node
/**
 * Links your Supabase login to the KOB sales workspace (for /dashboard/outbound).
 * Set SALES_OWNER_EMAIL=you@email.com in .env.local, then: npm run sales:link-user
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));

const email = process.env.SALES_OWNER_EMAIL?.trim().toLowerCase();
const restaurantId = process.env.OUTBOUND_WORKSPACE_RESTAURANT_ID?.trim();

if (!restaurantId) {
  console.error("❌ OUTBOUND_WORKSPACE_RESTAURANT_ID missing — run: npm run sales:bootstrap");
  process.exit(1);
}
if (!email) {
  console.error("❌ Add SALES_OWNER_EMAIL=your@login-email.com to .env.local, then re-run.");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    console.error("❌ Restaurant not found for OUTBOUND_WORKSPACE_RESTAURANT_ID");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) {
    console.error(`❌ No User row for ${email} — sign in once at http://localhost:3000/login first.`);
    process.exit(1);
  }

  await prisma.teamMember.upsert({
    where: { userId_restaurantId: { userId: user.id, restaurantId } },
    create: { userId: user.id, restaurantId, role: "OWNER" },
    update: { role: "OWNER" },
  });

  console.log(`✅ Linked ${email} → workspace "${restaurant.name}" (${restaurantId})`);
  console.log("   Open: http://localhost:3000/dashboard/outbound");
} finally {
  await prisma.$disconnect();
}
