
CREATE OR REPLACE FUNCTION public.use_import_quota(p_store_id uuid, p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month TEXT;
  v_used INTEGER;
  v_limit INTEGER;
  v_credit_spent BOOLEAN;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');
  
  INSERT INTO public.seller_import_quotas (store_id, month, imports_used, free_limit)
  VALUES (p_store_id, v_month, 0, 25)
  ON CONFLICT (store_id, month) DO NOTHING;
  
  SELECT siq.imports_used, siq.free_limit INTO v_used, v_limit
  FROM public.seller_import_quotas siq
  WHERE siq.store_id = p_store_id AND siq.month = v_month
  FOR UPDATE;
  
  IF v_used < v_limit THEN
    UPDATE public.seller_import_quotas
    SET imports_used = imports_used + 1
    WHERE store_id = p_store_id AND month = v_month;
    RETURN 'free';
  ELSE
    v_credit_spent := public.spend_credits(p_user_id, 0.10, 'Product import fee');
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
$function$;
