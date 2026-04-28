-- ============================================================
-- Multi-Business Migration for Smart GST Billing System
-- Run this in NeonDB SQL Editor (console.neon.tech)
-- ============================================================

-- 1. Create the businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID        NOT NULL,
    name        TEXT        NOT NULL DEFAULT 'My Business',
    address     TEXT        DEFAULT '',
    gstin       TEXT        DEFAULT '',
    phone       TEXT        DEFAULT '',
    email       TEXT        DEFAULT '',
    bank_name   TEXT        DEFAULT '',
    branch_name TEXT        DEFAULT '',
    account_no  TEXT        DEFAULT '',
    ifsc        TEXT        DEFAULT '',
    is_default  BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrate existing user_profiles into businesses (one business per user)
INSERT INTO businesses (user_id, name, address, gstin, phone, email, bank_name, branch_name, account_no, ifsc, is_default)
SELECT
    id,
    COALESCE(NULLIF(business_name,''),  'My Business'),
    COALESCE(business_address, ''),
    COALESCE(gstin,        ''),
    COALESCE(phone,        ''),
    COALESCE(email,        ''),
    COALESCE(bank_name,    ''),
    COALESCE(branch_name,  ''),
    COALESCE(account_no,   ''),
    COALESCE(ifsc,         ''),
    TRUE
FROM user_profiles
ON CONFLICT DO NOTHING;

-- 3. Add business_id to categories (so categories belong to a business)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS business_id BIGINT;

-- Link existing categories to the default business of their owner
UPDATE categories c
SET business_id = b.id
FROM businesses b
WHERE b.user_id = c.user_id
  AND b.is_default = TRUE
  AND c.business_id IS NULL;

-- 4. Add business_id to invoices (for filtering by business)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS business_id BIGINT;

-- Link existing invoices to the default business of their owner
UPDATE invoices i
SET business_id = b.id
FROM businesses b
WHERE b.user_id = i.user_id
  AND b.is_default = TRUE
  AND i.business_id IS NULL;

-- Done!
SELECT 'Migration complete' AS status,
       COUNT(*) AS businesses_created
FROM businesses;
