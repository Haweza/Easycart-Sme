-- ============================================================
--  EasyCart SME — Supabase Row-Level Security (RLS) Policies
--  Apply AFTER running schema.sql
-- ============================================================

-- Helper: get caller's role from profiles
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
--  PROFILES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
USING (current_user_role() = 'ADMIN');

-- Organizers can read profiles in their families
CREATE POLICY "profiles_select_organizer"
ON profiles FOR SELECT
USING (
  current_user_role() = 'ORGANIZER'
  AND id IN (
    SELECT fm.user_id FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE f.organizer_id = auth.uid()
  )
);

-- Users can update only their own non-role fields
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM profiles WHERE id = auth.uid()) -- cannot self-elevate
);

-- Admins can update any profile (including role assignment)
CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
USING (current_user_role() = 'ADMIN');

-- Auto-insert profile on signup (handled via trigger or service layer)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================================
--  SERVICES
-- ============================================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "services_select_public"
ON services FOR SELECT
USING (is_active = TRUE);

-- Admin full control
CREATE POLICY "services_all_admin"
ON services FOR ALL
USING (current_user_role() = 'ADMIN');

-- ============================================================
--  FAMILIES
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "families_all_admin"
ON families FOR ALL
USING (current_user_role() = 'ADMIN');

-- Organizers can read their assigned families
CREATE POLICY "families_select_organizer"
ON families FOR SELECT
USING (
  current_user_role() = 'ORGANIZER'
  AND organizer_id = auth.uid()
);

-- Members can read their family
CREATE POLICY "families_select_member"
ON families FOR SELECT
USING (
  id IN (
    SELECT family_id FROM family_members WHERE user_id = auth.uid()
  )
);

-- ============================================================
--  FAMILY SERVICES
-- ============================================================

ALTER TABLE family_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "family_services_admin"
ON family_services FOR ALL
USING (current_user_role() = 'ADMIN');

CREATE POLICY "family_services_organizer_select"
ON family_services FOR SELECT
USING (
  current_user_role() = 'ORGANIZER'
  AND family_id IN (SELECT id FROM families WHERE organizer_id = auth.uid())
);

CREATE POLICY "family_services_member_select"
ON family_services FOR SELECT
USING (
  family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
);

-- ============================================================
--  FAMILY MEMBERS
-- ============================================================

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "family_members_all_admin"
ON family_members FOR ALL
USING (current_user_role() = 'ADMIN');

-- Organizers can view members of their families
CREATE POLICY "family_members_select_organizer"
ON family_members FOR SELECT
USING (
  current_user_role() = 'ORGANIZER'
  AND family_id IN (SELECT id FROM families WHERE organizer_id = auth.uid())
);

-- Members can see their own record
CREATE POLICY "family_members_select_own"
ON family_members FOR SELECT
USING (user_id = auth.uid());

-- ============================================================
--  SERVICE REQUESTS
-- ============================================================

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "service_requests_select_own"
ON service_requests FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "service_requests_insert_own"
ON service_requests FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'CUSTOMER'
);

-- Admins have full access
CREATE POLICY "service_requests_all_admin"
ON service_requests FOR ALL
USING (current_user_role() = 'ADMIN');

-- ============================================================
--  INVITES
-- ============================================================

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Recipients can view their own invites
CREATE POLICY "invites_select_recipient"
ON invites FOR SELECT
USING (recipient_id = auth.uid());

-- Recipients can update ONLY their own PENDING invite (accept/decline)
CREATE POLICY "invites_update_recipient"
ON invites FOR UPDATE
USING (
  recipient_id = auth.uid()
  AND status = 'PENDING'
)
WITH CHECK (
  status IN ('ACCEPTED', 'DECLINED')
);

-- Admins have full access
CREATE POLICY "invites_all_admin"
ON invites FOR ALL
USING (current_user_role() = 'ADMIN');
