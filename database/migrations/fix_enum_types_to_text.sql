-- ============================================================
--  EasyCart SME — Migration: Drop Custom Enum Types → TEXT
--  Run this in Supabase SQL Editor to fix the live database.
--
--  Root cause: PostgreSQL custom ENUM types are not compatible
--  with Hibernate's character varying binding. This causes:
--    ERROR: operator does not exist: <enum_type> = character varying
--
--  Fix: Convert all affected columns to TEXT (preserving data).
-- ============================================================

-- 1. family_members.status  (membership_status → TEXT)
ALTER TABLE family_members
  ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- 2. service_requests.status  (request_status → TEXT)
ALTER TABLE service_requests
  ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- 3. invites.status  (invite_status → TEXT)
ALTER TABLE invites
  ALTER COLUMN status TYPE TEXT USING status::TEXT;

-- 4. Drop the now-unused custom enum types
--    (only after all columns are converted)
DROP TYPE IF EXISTS membership_status;
DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS invite_status;
DROP TYPE IF EXISTS user_role;   -- was already converted for profiles.role earlier

-- ============================================================
--  Verify: these queries should all return results without error
-- ============================================================
-- SELECT status FROM family_members LIMIT 5;
-- SELECT status FROM service_requests LIMIT 5;
-- SELECT status FROM invites LIMIT 5;
