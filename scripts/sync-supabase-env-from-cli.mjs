#!/usr/bin/env node
/**
 * Sync Supabase env vars from the linked CLI project (harbor-dev, etc.).
 * Run after: npm run supabase:link
 *
 *   npm run supabase:sync-env
 *
 * Optional: set SUPABASE_DB_PASSWORD in .env.local (Database password from dashboard).
 * The script builds DATABASE_URL from supabase/.temp/pooler-url + that password.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = resolve(root, ".env.local");

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function loadEnvMap(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    map.set(t.slice(0, i).trim(), t.slice(i + 1).trim());
  }
  return map;
}

function upsertEnvLine(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) return text.replace(re, line);
  const marker = "# --- Supabase (auth + client) ---";
  if (text.includes(marker)) {
    return text.replace(marker, `${marker}\n${line}`);
  }
  return `${text.trimEnd()}\n${line}\n`;
}

function getLinkedRef() {
  const refFile = resolve(root, "supabase/.temp/project-ref");
  if (existsSync(refFile)) {
    return readFileSync(refFile, "utf8").trim();
  }
  try {
    const out = execSync("npx supabase projects list -o json", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const projects = JSON.parse(out);
    const linked = projects.find((p) => p.linked);
    return linked?.id ?? linked?.ref ?? "";
  } catch {
    return "";
  }
}

function getPoolerBaseUrl() {
  const poolerFile = resolve(root, "supabase/.temp/pooler-url");
  if (existsSync(poolerFile)) {
    return readFileSync(poolerFile, "utf8").trim();
  }
  return "";
}

function getAnonKey(ref) {
  const out = execSync(`npx supabase projects api-keys --project-ref ${ref} -o json`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const keys = JSON.parse(out);
  const legacy = keys.find((k) => k.name === "anon" && k.type === "legacy");
  if (legacy?.api_key) return legacy.api_key;
  const publishable = keys.find((k) => k.type === "publishable");
  return publishable?.api_key ?? "";
}

function buildDatabaseUrl(poolerBase, password) {
  const u = new URL(poolerBase);
  u.password = password;
  if (!u.searchParams.has("sslmode")) {
    u.searchParams.set("sslmode", "require");
  }
  return u.toString();
}

/** Reuse password already in .env.local DATABASE_URL when switching linked projects. */
function passwordFromExistingDatabaseUrl(envMap) {
  const raw = envMap.get("DATABASE_URL")?.replace(/^["']|["']$/g, "");
  if (!raw) return "";
  try {
    return new URL(raw).password || "";
  } catch {
    return "";
  }
}

function isDeadDirectSupabaseHost(hostname) {
  return /^db\.[a-z0-9]+\.supabase\.co$/i.test(hostname);
}

const ref = getLinkedRef();
if (!ref) {
  console.error("No linked Supabase project. Run: npm run supabase:link");
  process.exit(1);
}

const anonKey = getAnonKey(ref);
if (!anonKey) {
  console.error("Could not read anon key from CLI. Run: npm run supabase:login");
  process.exit(1);
}

const supabaseUrl = `https://${ref}.supabase.co`;
let envText = readText(envLocalPath);
if (!envText) {
  console.error("Missing .env.local — copy from .env.example first.");
  process.exit(1);
}

const envMap = loadEnvMap(envText);
const dbPassword =
  process.env.SUPABASE_DB_PASSWORD?.trim() ||
  envMap.get("SUPABASE_DB_PASSWORD")?.replace(/^["']|["']$/g, "") ||
  passwordFromExistingDatabaseUrl(envMap) ||
  "";

envText = upsertEnvLine(envText, "NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
envText = upsertEnvLine(envText, "NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);

const poolerBase = getPoolerBaseUrl();
const existingDbUrl = envMap.get("DATABASE_URL")?.replace(/^["']|["']$/g, "");
let existingHost = "";
try {
  if (existingDbUrl) existingHost = new URL(existingDbUrl).hostname;
} catch {
  /* ignore */
}

if (dbPassword && poolerBase) {
  const databaseUrl = buildDatabaseUrl(poolerBase, dbPassword);
  envText = upsertEnvLine(envText, "DATABASE_URL", databaseUrl);
  writeFileSync(envLocalPath, envText, "utf8");
  console.log("Synced .env.local from linked Supabase project:", ref);
  console.log("Updated: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL");
  if (existingHost && isDeadDirectSupabaseHost(existingHost)) {
    console.log("(Replaced old direct db.* host with session pooler for linked project.)");
  }
} else {
  writeFileSync(envLocalPath, envText, "utf8");
  console.log("Synced .env.local from linked Supabase project:", ref);
  console.log("Updated: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.log("");
  console.log("DATABASE_URL still needs your database password (CLI does not store it).");
  console.log("1. Supabase dashboard → Project → Settings → Database → Database password");
  console.log("2. Add to .env.local:  SUPABASE_DB_PASSWORD=your-password");
  console.log("3. Run again: npm run supabase:sync-env");
  process.exit(2);
}
