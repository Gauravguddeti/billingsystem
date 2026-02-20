-- Add MRP, HSN, and discount_amount columns
-- Run this in your Supabase SQL editor

-- Add mrp and hsn to product_rates
ALTER TABLE product_rates
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hsn TEXT DEFAULT '';

-- Add mrp and discount_amount to invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS mrp NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0;

-- Update existing rows with defaults
UPDATE product_rates SET mrp = 0 WHERE mrp IS NULL;
UPDATE product_rates SET hsn = '' WHERE hsn IS NULL;
UPDATE invoice_items SET mrp = 0 WHERE mrp IS NULL;
UPDATE invoice_items SET discount_amount = 0 WHERE discount_amount IS NULL;

COMMENT ON COLUMN product_rates.mrp IS 'Maximum Retail Price';
COMMENT ON COLUMN product_rates.hsn IS 'HSN code for the product';
COMMENT ON COLUMN invoice_items.mrp IS 'MRP at time of invoice';
COMMENT ON COLUMN invoice_items.discount_amount IS 'Fixed discount amount (takes priority over discount %)';
