
-- Table to track monthly import quotas per store
CREATE TABLE public.seller_import_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- e.g. '2026-03'
  imports_used INTEGER NOT NULL DEFAULT 0,
  free_limit INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, month)
);

-- Enable RLS
ALTER TABLE public.seller_import_quotas ENABLE ROW LEVEL SECURITY;

-- Store owners can read their own quota
CREATE POLICY "Store owners can view their import quotas"
  ON public.seller_import_quotas
  FOR SELECT
  TO authenticated
  USING (
    public.is_store_owner(store_id, auth.uid())
    OR public.is_store_team_member(store_id, auth.uid())
  );

-- Only service_role writes (via edge function), so no INSERT/UPDATE policies for authenticated users

-- Function to get or create quota for current month and return remaining free imports
CREATE OR REPLACE FUNCTION public.get_import_quota(p_store_id UUID)
RETURNS TABLE(imports_used INTEGER, free_limit INTEGER, remaining_free INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month TEXT;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.seller_import_quotas (store_id, month, imports_used, free_limit)
  VALUES (p_store_id, v_month, 0, 25)
  ON CONFLICT (store_id, month) DO NOTHING;
  
  SELECT siq.imports_used, siq.free_limit INTO v_used, v_limit
  FROM public.seller_import_quotas siq
  WHERE siq.store_id = p_store_id AND siq.month = v_month;
  
  RETURN QUERY SELECT v_used, v_limit, GREATEST(0, v_limit - v_used);
END;
$$;

-- Function to consume one import credit (returns true if allowed, false if needs payment)
CREATE OR REPLACE FUNCTION public.use_import_quota(p_store_id UUID, p_user_id UUID)
RETURNS TEXT -- 'free', 'credit', or 'insufficient'
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month TEXT;
  v_used INTEGER;
  v_limit INTEGER;
  v_credit_spent BOOLEAN;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');
  
  -- Ensure quota row exists
  INSERT INTO public.seller_import_quotas (store_id, month, imports_used, free_limit)
  VALUES (p_store_id, v_month, 0, 25)
  ON CONFLICT (store_id, month) DO NOTHING;
  
  -- Get current usage with lock
  SELECT siq.imports_used, siq.free_limit INTO v_used, v_limit
  FROM public.seller_import_quotas siq
  WHERE siq.store_id = p_store_id AND siq.month = v_month
  FOR UPDATE;
  
  IF v_used < v_limit THEN
    -- Free import available
    UPDATE public.seller_import_quotas
    SET imports_used = imports_used + 1
    WHERE store_id = p_store_id AND month = v_month;
    RETURN 'free';
  ELSE
    -- Need to spend 1 credit
    v_credit_spent := public.spend_credits(p_user_id, 1, 'Product import fee');
    IF v_credit_spent THEN
      UPDATE public.seller_import_quotas
      SET imports_used = imports_used + 1
      WHERE store_id = p_store_id AND month = v_month;
      RETURN 'credit';
    ELSE
      RETURN 'insufficient';
    END IF;
  END IF;
END;
$$;
