-- stores/products UPDATE RLS policies had no WITH CHECK, so RLS only verified
-- row ownership, not which columns changed. A seller could PATCH their own
-- store/product row directly via the Supabase client and set staff-only
-- fields (is_verified, commission_rate, moderation_status, is_featured, etc.)
-- that the legitimate UI never exposes. Column-level protection isn't
-- expressible in a WITH CHECK clause without a self-referential subquery, so
-- use a BEFORE UPDATE trigger that reverts protected columns back to their
-- prior value whenever the caller isn't staff.

CREATE OR REPLACE FUNCTION public.protect_store_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role covers backend/edge-function writes (e.g. total_revenue,
  -- total_sales, product_count, average_rating updates), which have no JWT
  -- auth.uid() and must not be reverted by this trigger.
  IF NOT (public.is_staff(auth.uid()) OR auth.role() = 'service_role') THEN
    NEW.owner_id := OLD.owner_id;
    NEW.created_at := OLD.created_at;
    NEW.commission_rate := OLD.commission_rate;
    NEW.custom_commission_rate := OLD.custom_commission_rate;
    NEW.custom_rate_expires_at := OLD.custom_rate_expires_at;
    NEW.custom_rate_set_by := OLD.custom_rate_set_by;
    NEW.custom_rate_set_at := OLD.custom_rate_set_at;
    NEW.free_commission_until := OLD.free_commission_until;
    NEW.is_verified := OLD.is_verified;
    NEW.is_active := OLD.is_active;
    NEW.status := OLD.status;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.total_sales := OLD.total_sales;
    NEW.total_revenue := OLD.total_revenue;
    NEW.product_count := OLD.product_count;
    NEW.average_rating := OLD.average_rating;
    NEW.follower_count := OLD.follower_count;
    NEW.is_trusted := OLD.is_trusted;
    NEW.is_testing := OLD.is_testing;
    NEW.deleted_at := OLD.deleted_at;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_store_staff_fields_trigger ON public.stores;
CREATE TRIGGER protect_store_staff_fields_trigger
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.protect_store_staff_fields();

CREATE OR REPLACE FUNCTION public.protect_product_staff_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_staff(auth.uid()) OR auth.role() = 'service_role') THEN
    NEW.created_at := OLD.created_at;
    NEW.store_id := OLD.store_id;
    NEW.is_seller_product := OLD.is_seller_product;
    NEW.is_featured := OLD.is_featured;
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderation_notes := OLD.moderation_notes;
    NEW.moderation_flags := OLD.moderation_flags;
    NEW.download_count := OLD.download_count;
    NEW.product_number := OLD.product_number;
    NEW.deleted_at := OLD.deleted_at;
    -- is_active is intentionally left seller-editable — it's the existing
    -- pause/unpause-my-listing toggle used by the product editor.
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_product_staff_fields_trigger ON public.products;
CREATE TRIGGER protect_product_staff_fields_trigger
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.protect_product_staff_fields();
