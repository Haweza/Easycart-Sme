-- ============================================================
--  EasyCart SME — Migration 003
--  Description: Create electronic_products table for
--               the admin-managed product listings
--               displayed on the public landing page.
--  Expiry: Posts are considered active for 3 days from created_at
-- ============================================================

CREATE TABLE IF NOT EXISTS electronic_products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    price         TEXT NOT NULL,          -- Flexible format e.g. "ZMW 15,500" or "15500"
    image_content TEXT NOT NULL,          -- Base64 Data URL of the uploaded product image
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to efficiently query recently created (active) products
CREATE INDEX IF NOT EXISTS idx_electronic_products_created_at
    ON electronic_products(created_at DESC);
