
-- Add new columns for spend-based CPC/CPM model
ALTER TABLE public.product_promotions
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'cpc',
  ADD COLUMN IF NOT EXISTS cpc_bid numeric DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS cpm_bid numeric DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS daily_budget_limit numeric,
  ADD COLUMN IF NOT EXISTS total_budget numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS placement_zones text[] NOT NULL DEFAULT '{homepage}';

-- RPC: get_weighted_promotion - weighted random selection for a zone
CREATE OR REPLACE FUNCTION public.get_weighted_promotion(
  p_zone text,
  p_category_id uuid DEFAULT NULL
)
RETURNS TABLE(
  promotion_id uuid,
  product_id uuid,
  pricing_model text,
  cpc_bid numeric,
  cpm_bid numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weight numeric;
  v_random numeric;
  v_cumulative numeric := 0;
  v_row RECORD;
BEGIN
  -- Calculate total weight of eligible campaigns
  SELECT COALESCE(SUM(
    CASE pp.pricing_model
      WHEN 'cpc' THEN pp.cpc_bid
      WHEN 'cpm' THEN pp.cpm_bid
      ELSE pp.cpc_bid
    END
  ), 0) INTO v_total_weight
  FROM product_promotions pp
  JOIN products p ON p.id = pp.product_id
  JOIN stores s ON s.id = p.store_id
  WHERE pp.status = 'active'
    AND p_zone = ANY(pp.placement_zones)
    AND pp.total_spent < pp.total_budget
    AND (pp.daily_budget_limit IS NULL OR pp.total_spent < pp.total_budget)
    AND p.is_active = true
    AND s.is_active = true
    AND (s.is_testing IS NULL OR s.is_testing = false)
    AND (p_category_id IS NULL OR pp.category_id = p_category_id);

  IF v_total_weight = 0 THEN
    RETURN;
  END IF;

  v_random := random() * v_total_weight;

  FOR v_row IN
    SELECT pp.id as promo_id, pp.product_id, pp.pricing_model as pm, pp.cpc_bid, pp.cpm_bid,
      CASE pp.pricing_model
        WHEN 'cpc' THEN pp.cpc_bid
        WHEN 'cpm' THEN pp.cpm_bid
        ELSE pp.cpc_bid
      END as weight
    FROM product_promotions pp
    JOIN products p ON p.id = pp.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE pp.status = 'active'
      AND p_zone = ANY(pp.placement_zones)
      AND pp.total_spent < pp.total_budget
      AND p.is_active = true
      AND s.is_active = true
      AND (s.is_testing IS NULL OR s.is_testing = false)
      AND (p_category_id IS NULL OR pp.category_id = p_category_id)
    ORDER BY weight DESC
  LOOP
    v_cumulative := v_cumulative + v_row.weight;
    IF v_cumulative >= v_random THEN
      promotion_id := v_row.promo_id;
      product_id := v_row.product_id;
      pricing_model := v_row.pm;
      cpc_bid := v_row.cpc_bid;
      cpm_bid := v_row.cpm_bid;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- RPC: record_promotion_click - atomic CPC charge
CREATE OR REPLACE FUNCTION public.record_promotion_click(p_promotion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_cost numeric;
BEGIN
  SELECT * INTO v_promo
  FROM product_promotions
  WHERE id = p_promotion_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  v_cost := CASE v_promo.pricing_model WHEN 'cpc' THEN v_promo.cpc_bid ELSE 0 END;

  UPDATE product_promotions
  SET
    clicks = clicks + 1,
    total_spent = total_spent + v_cost,
    status = CASE
      WHEN (total_spent + v_cost) >= total_budget THEN 'paused'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_promotion_id;

  -- Deduct from seller credit balance
  IF v_cost > 0 THEN
    UPDATE credit_balances
    SET balance = balance - v_cost, total_spent = total_spent + v_cost, updated_at = now()
    WHERE user_id = v_promo.user_id;

    INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
    VALUES (v_promo.user_id, v_cost, 'spend', 'Ad click charge - Campaign ' || COALESCE(v_promo.campaign_name, v_promo.id::text), p_promotion_id::text);
  END IF;

  RETURN true;
END;
$$;

-- RPC: charge_promotion_impression - atomic CPM charge per impression batch
CREATE OR REPLACE FUNCTION public.charge_promotion_impression(p_promotion_id uuid, p_count integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_cost numeric;
BEGIN
  SELECT * INTO v_promo
  FROM product_promotions
  WHERE id = p_promotion_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Increment impressions
  UPDATE product_promotions
  SET impressions = impressions + p_count, updated_at = now()
  WHERE id = p_promotion_id;

  -- CPM charge: every 1000 impressions
  IF v_promo.pricing_model = 'cpm' AND ((v_promo.impressions + p_count) / 1000) > (v_promo.impressions / 1000) THEN
    v_cost := v_promo.cpm_bid;

    UPDATE product_promotions
    SET
      total_spent = total_spent + v_cost,
      status = CASE WHEN (total_spent + v_cost) >= total_budget THEN 'paused' ELSE status END,
      updated_at = now()
    WHERE id = p_promotion_id;

    UPDATE credit_balances
    SET balance = balance - v_cost, total_spent = total_spent + v_cost, updated_at = now()
    WHERE user_id = v_promo.user_id;

    INSERT INTO credit_transactions (user_id, amount, type, description, reference_id)
    VALUES (v_promo.user_id, v_cost, 'spend', 'Ad CPM charge - Campaign ' || COALESCE(v_promo.campaign_name, v_promo.id::text), p_promotion_id::text);
  ELSIF v_promo.pricing_model != 'cpm' THEN
    -- For CPC, just track impressions without charging
    NULL;
  END IF;

  RETURN true;
END;
$$;
