-- Add payment tracking columns to invoices table

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partial')),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add index for payment queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- Update existing invoices to have unpaid status
UPDATE invoices SET payment_status = 'unpaid', amount_paid = 0 WHERE payment_status IS NULL;

COMMENT ON COLUMN invoices.payment_status IS 'Payment status: unpaid, paid, or partial';
COMMENT ON COLUMN invoices.amount_paid IS 'Amount paid towards this invoice';
COMMENT ON COLUMN invoices.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN invoices.payment_notes IS 'Payment notes or transaction reference';
