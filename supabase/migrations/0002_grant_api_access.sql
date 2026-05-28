-- ============================================================
-- Migration 0002 — Grant Data API access to public tables
-- ============================================================
-- The project was created with "Automatically expose new tables"
-- OFF, so tables from migration 0001 were never granted to the
-- API roles (anon / authenticated). Every REST query failed with
-- "permission denied for table" (42501) before RLS could even run.
--
-- This grants table-level access to those roles. ROW-level security
-- (enabled in 0001) is still the real gate: anon has no policies so
-- it sees nothing; authenticated users only see rows their policies
-- allow. This mirrors Supabase's standard default setup.
-- ============================================================

grant usage on schema public to anon, authenticated;

-- Existing tables (from 0001)
grant select, insert, update, delete
  on all tables in schema public to anon, authenticated;

grant usage, select
  on all sequences in schema public to anon, authenticated;

-- Future tables/sequences created by the migration role inherit the
-- same grants, so we don't have to repeat this in every migration.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- ============================================================
-- End of migration 0002
-- ============================================================
