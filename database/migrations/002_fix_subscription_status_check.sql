-- ============================================================
--  EasyCart SME — Migration: Fix Subscriptions Status Check Constraint
--  Run this in Supabase SQL Editor or let application run it automatically.
--
--  Root cause: Hibernate created a check constraint restricting status to ('ACTIVE', 'EXPIRED').
--  Now we added 'PENDING' to the enum, which violates this constraint.
-- ============================================================

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'EXPIRED'::text]));
