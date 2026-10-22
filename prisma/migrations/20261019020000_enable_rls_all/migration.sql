-- Deny-all RLS on every public table (no policies). Prisma connects as the owner role, which bypasses RLS;
-- the Supabase Data API (anon / authenticated) can no longer read or write any KOB table.
-- Idempotent; covers tables added after 20260529200000_enable_rls_public. New tables enable RLS in their own migration.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END
$$;
