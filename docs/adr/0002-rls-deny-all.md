# ADR 0002: Row-level security is deny-all; the app reads and writes through Prisma

Date: 23 Oct 2026 · Status: accepted

## Decision

Every table in `public` has row-level security **enabled with no policies**. That denies all access through the
Supabase Data API (`anon` and `authenticated` keys). KOB reaches its data only through Prisma on the server, which
connects as the table owner and so isn't subject to RLS.

## Why

- The browser's Supabase client is only used for auth (`getSession`, `setSession`, `getUser`, sign-in). Nothing in
  the app calls `supabase.from(...)` or `rpc(...)`, so there is no browser access to allow.
- Tenant checks live in one place: server routes check the session and the `TeamMember` row for the restaurant
  (`lib/api/restaurant-access.ts`, `lib/agent/access.ts`, `lib/kob/talk/access.ts`). Writing matching RLS policies
  as well would be a second copy of the same rules that could drift.
- If the anon key leaks (it is public by design), it can't read a single row.

## Rules

- New tables enable RLS in the migration that creates them (`ALTER TABLE … ENABLE ROW LEVEL SECURITY`).
- Never add a policy that grants `anon` or `authenticated` access without a new ADR.
- `tests/security/rls.test.ts` fails CI if any public table has RLS off, or if a role without ownership can read rows.
