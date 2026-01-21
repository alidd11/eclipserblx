-- Add bank transfer fields for overseas payouts
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_number TEXT,
ADD COLUMN IF NOT EXISTS bank_swift_bic TEXT,
ADD COLUMN IF NOT EXISTS bank_country TEXT;