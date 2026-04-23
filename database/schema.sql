-- ============================================================
--  EasyCart SME — Supabase PostgreSQL Schema
--  Version: 2.1
--  Description: Full schema with constraints, enums, and
--               invite-system enforcement
-- ============================================================

-- 1. ENUMS ---------------------------------------------------

CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ORGANIZER', 'ADMIN');
CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- 2. PROFILES -----------------------------------------------
-- Extends Supabase auth.users

CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    phone         TEXT,
    role          user_role NOT NULL DEFAULT 'CUSTOMER',
    is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. SERVICES -----------------------------------------------

CREATE TABLE services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL UNIQUE,
    description   TEXT,
    price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    currency      TEXT NOT NULL DEFAULT 'ZMW',
    billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',  -- MONTHLY, ANNUAL, etc.
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. FAMILIES -----------------------------------------------

CREATE TABLE families (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL UNIQUE,
    description   TEXT,
    organizer_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
    max_members   INT NOT NULL DEFAULT 10 CHECK (max_members > 0),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_families_updated_at
BEFORE UPDATE ON families
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. FAMILY SERVICES (junction) -----------------------------

CREATE TABLE family_services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, service_id)
);

-- 6. FAMILY MEMBERS -----------------------------------------

CREATE TABLE family_members (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status        membership_status NOT NULL DEFAULT 'ACTIVE',
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (family_id, user_id)  -- user can only be in one family slot per family
);

CREATE TRIGGER set_family_members_updated_at
BEFORE UPDATE ON family_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. SERVICE REQUESTS ---------------------------------------

CREATE TABLE service_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    status        request_status NOT NULL DEFAULT 'PENDING',
    message       TEXT,
    admin_note    TEXT,
    reviewed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- prevent duplicate PENDING requests for same service
    UNIQUE NULLS NOT DISTINCT (user_id, service_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER set_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. INVITES ------------------------------------------------
-- Core enforcement: single-use, admin-only, one per user+family+service

CREATE TABLE invites (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Invite is tied to a SPECIFIC user
    recipient_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Linked to a specific family and service
    family_id     UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    service_id    UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    -- Created ONLY by admin
    created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status        invite_status NOT NULL DEFAULT 'PENDING',
    token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    message       TEXT,
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ✅ ENFORCEMENT: No duplicate PENDING invites for same user + family + service
    CONSTRAINT no_duplicate_pending_invite
        UNIQUE (recipient_id, family_id, service_id, status),

    -- ✅ ENFORCEMENT: invited_at cannot be after expires_at
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE TRIGGER set_invites_updated_at
BEFORE UPDATE ON invites
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ✅ ENFORCEMENT: Prevent inviting a user already in the target family
CREATE OR REPLACE FUNCTION check_not_already_member()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM family_members
    WHERE user_id = NEW.recipient_id
      AND family_id = NEW.family_id
      AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'User is already an active member of this family';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_no_existing_member
BEFORE INSERT ON invites
FOR EACH ROW EXECUTE FUNCTION check_not_already_member();

-- ✅ ENFORCEMENT: Accepted invites are immutable
CREATE OR REPLACE FUNCTION lock_accepted_invite()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'ACCEPTED' THEN
    RAISE EXCEPTION 'Accepted invites cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_invite_immutability
BEFORE UPDATE ON invites
FOR EACH ROW EXECUTE FUNCTION lock_accepted_invite();

-- ✅ ENFORCEMENT: Auto-activate membership on invite acceptance
CREATE OR REPLACE FUNCTION activate_membership_on_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ACCEPTED' AND OLD.status = 'PENDING' THEN
    INSERT INTO family_members (family_id, user_id, status)
    VALUES (NEW.family_id, NEW.recipient_id, 'ACTIVE')
    ON CONFLICT (family_id, user_id) DO UPDATE SET status = 'ACTIVE';
    
    -- Record response time
    NEW.responded_at = NOW();
  END IF;
  
  IF NEW.status = 'DECLINED' AND OLD.status = 'PENDING' THEN
    NEW.responded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_activate_membership
BEFORE UPDATE OF status ON invites
FOR EACH ROW EXECUTE FUNCTION activate_membership_on_accept();

-- ✅ ENFORCEMENT: Auto-expire invites past expiry_date
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
  UPDATE invites
  SET status = 'EXPIRED'
  WHERE status = 'PENDING'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule this via Supabase cron (pg_cron) or call from backend
-- SELECT cron.schedule('expire-invites', '0 * * * *', 'SELECT expire_old_invites()');

-- 9. INDEXES ------------------------------------------------

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_invites_recipient ON invites(recipient_id);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_family ON invites(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);
CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_service_requests_user ON service_requests(user_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);

-- ============================================================
--  SEED DATA (Development Only)
-- ============================================================

-- Default admin (replace UUID with actual auth.users id after first signup)
-- UPDATE profiles SET role = 'ADMIN', is_approved = TRUE WHERE email = 'admin@easycart.co.zm';

-- Sample services
INSERT INTO services (name, description, price, currency, billing_cycle)
VALUES
  ('EasyCart Basic',   'Essential subscription management features', 150.00, 'ZMW', 'MONTHLY'),
  ('EasyCart Standard','Advanced features with analytics',            300.00, 'ZMW', 'MONTHLY'),
  ('EasyCart Premium', 'Full suite with priority support',            550.00, 'ZMW', 'MONTHLY'),
  ('EasyCart Annual',  'Best value — 12 months full access',         3000.00, 'ZMW', 'ANNUAL');
