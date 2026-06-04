-- Migration: Create promo_users table
-- Date: 2026-06-03
-- Purpose: Isolated tracking of promotional access users, separate from regular subscriptions

-- Create promo_users table
CREATE TABLE IF NOT EXISTS promo_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    notes TEXT,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(profile_id, service_id, plan_id, start_date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_promo_users_profile_id ON promo_users(profile_id);
CREATE INDEX IF NOT EXISTS idx_promo_users_service_id ON promo_users(service_id);
CREATE INDEX IF NOT EXISTS idx_promo_users_approval_status ON promo_users(approval_status);
CREATE INDEX IF NOT EXISTS idx_promo_users_status ON promo_users(status);
CREATE INDEX IF NOT EXISTS idx_promo_users_expiry_date ON promo_users(expiry_date);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promo_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_promo_users_updated_at ON promo_users;
CREATE TRIGGER update_promo_users_updated_at
BEFORE UPDATE ON promo_users
FOR EACH ROW
EXECUTE FUNCTION update_promo_users_updated_at();

-- Grant permissions (adjust schema/user as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON promo_users TO [app_user];
-- GRANT USAGE ON SCHEMA public TO [app_user];
