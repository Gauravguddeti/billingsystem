-- Phase 4: History Page & History Improvements
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS igst NUMERIC(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invoice';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reference_invoice_id UUID REFERENCES public.invoices(id);

-- Soft delete
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Phase 6: Products Page
ALTER TABLE public.product_rates ADD COLUMN IF NOT EXISTS stock_qty INTEGER;

-- RLS Update: enforce user_id matching and non-deleted
-- We don't drop existing policies as it could be destructive without checking,
-- but we can add new security. For now, since policies already restrict by user_id,
-- soft-delete will be handled at the application layer WHERE is_deleted = false.

-- To handle sequential invoice numbers properly per user, we create a sequence table
CREATE TABLE IF NOT EXISTS public.user_invoice_sequences (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    last_sequence INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_invoice_sequences
ALTER TABLE public.user_invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invoice_sequences' AND policyname = 'Users can view own sequences'
    ) THEN
        CREATE POLICY "Users can view own sequences" ON public.user_invoice_sequences FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invoice_sequences' AND policyname = 'Users can insert own sequences'
    ) THEN
        CREATE POLICY "Users can insert own sequences" ON public.user_invoice_sequences FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_invoice_sequences' AND policyname = 'Users can update own sequences'
    ) THEN
        CREATE POLICY "Users can update own sequences" ON public.user_invoice_sequences FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;
