-- =====================================================
-- SECURITY FIX: Move sensitive Discord credentials to separate table
-- This provides defense-in-depth - even if RLS on stores is misconfigured,
-- credentials remain protected in a separate table with stricter access
-- =====================================================

-- Step 1: Create store_credentials table for sensitive Discord data
CREATE TABLE public.store_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
    discord_webhook_url TEXT,
    review_discord_webhook_url TEXT,
    discord_bot_token TEXT,
    discord_guild_id TEXT,
    discord_role_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create index for fast lookups
CREATE INDEX idx_store_credentials_store_id ON public.store_credentials(store_id);

-- Step 3: Enable RLS with STRICT owner-only access
ALTER TABLE public.store_credentials ENABLE ROW LEVEL SECURITY;

-- Only store owners can view their credentials
CREATE POLICY "Owners can view own store credentials"
ON public.store_credentials
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_credentials.store_id
        AND s.owner_id = auth.uid()
    )
);

-- Only store owners can update their credentials
CREATE POLICY "Owners can update own store credentials"
ON public.store_credentials
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_credentials.store_id
        AND s.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_credentials.store_id
        AND s.owner_id = auth.uid()
    )
);

-- Only store owners can insert credentials for their store
CREATE POLICY "Owners can insert own store credentials"
ON public.store_credentials
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = store_credentials.store_id
        AND s.owner_id = auth.uid()
    )
);

-- Staff with admin role can view all credentials (for support/debugging)
CREATE POLICY "Admins can view all store credentials"
ON public.store_credentials
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Step 4: Migrate existing credentials from stores table
INSERT INTO public.store_credentials (store_id, discord_webhook_url, review_discord_webhook_url, discord_bot_token, discord_guild_id, discord_role_id)
SELECT 
    id,
    discord_webhook_url,
    review_discord_webhook_url,
    discord_bot_token,
    discord_guild_id,
    discord_role_id
FROM public.stores
WHERE discord_webhook_url IS NOT NULL
   OR review_discord_webhook_url IS NOT NULL
   OR discord_bot_token IS NOT NULL
   OR discord_guild_id IS NOT NULL
   OR discord_role_id IS NOT NULL;

-- Step 5: Create trigger to auto-create credentials row when store is created
CREATE OR REPLACE FUNCTION public.create_store_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.store_credentials (store_id)
    VALUES (NEW.id)
    ON CONFLICT (store_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER create_store_credentials_trigger
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.create_store_credentials();

-- Step 6: Add updated_at trigger
CREATE TRIGGER update_store_credentials_updated_at
BEFORE UPDATE ON public.store_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Add comment explaining the security purpose
COMMENT ON TABLE public.store_credentials IS 'Sensitive store credentials (Discord tokens, webhooks) separated for security. RLS restricts to owner-only access.';