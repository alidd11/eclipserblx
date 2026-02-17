
CREATE OR REPLACE FUNCTION public.update_store_sales_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.type = 'sale' THEN
    UPDATE stores
    SET total_sales = COALESCE(total_sales, 0) + 1,
        total_revenue = COALESCE(total_revenue, 0) + COALESCE(NEW.gross_amount, 0)
    WHERE id = NEW.store_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.refunded_at IS NOT NULL AND OLD.refunded_at IS NULL AND NEW.type = 'sale' THEN
    UPDATE stores
    SET total_sales = GREATEST(COALESCE(total_sales, 0) - 1, 0),
        total_revenue = GREATEST(COALESCE(total_revenue, 0) - COALESCE(NEW.gross_amount, 0), 0)
    WHERE id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_store_sales_on_transaction
AFTER INSERT OR UPDATE ON public.seller_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_store_sales_stats();
