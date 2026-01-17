-- Create robux_transactions table for tracking Roblox game earnings
CREATE TABLE public.robux_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    roblox_user_id TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    robux_amount INTEGER NOT NULL,
    robux_after_tax INTEGER NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL DEFAULT 'developer_product',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_robux_transactions_created_at ON public.robux_transactions(created_at DESC);
CREATE INDEX idx_robux_transactions_transaction_id ON public.robux_transactions(transaction_id);

-- Enable RLS
ALTER TABLE public.robux_transactions ENABLE ROW LEVEL SECURITY;

-- Only staff can view transactions
CREATE POLICY "Staff can view robux transactions"
ON public.robux_transactions
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add to realtime for live updates in admin
ALTER PUBLICATION supabase_realtime ADD TABLE public.robux_transactions;