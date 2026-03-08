
-- 1. CRITICAL: Prevent users from self-updating staff_id (privilege escalation fix)
-- Add a trigger that prevents non-staff users from modifying their own staff_id
CREATE OR REPLACE FUNCTION public.protect_staff_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If staff_id is being changed and the caller is not staff, revert it
  IF OLD.staff_id IS DISTINCT FROM NEW.staff_id THEN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'moderator') THEN
      NEW.staff_id := OLD.staff_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_staff_id_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_staff_id();

-- 2. Replace staff_id IS NOT NULL policies with has_role() checks

-- Fix seller_discount_codes admin policy
DROP POLICY IF EXISTS "Admins can manage all discount codes" ON public.seller_discount_codes;
CREATE POLICY "Admins can manage all discount codes"
  ON public.seller_discount_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Fix seller_analytics admin policy
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.seller_analytics;
CREATE POLICY "Admins can view all analytics"
  ON public.seller_analytics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Fix feature_flags admin policy
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 3. Fix discount_codes: hide restricted codes from anonymous users
DROP POLICY IF EXISTS "Anyone can view discount codes" ON public.discount_codes;

-- Public can only see non-restricted active codes
CREATE POLICY "Public can view active non-restricted discount codes"
  ON public.discount_codes
  FOR SELECT
  USING (is_active = true AND restricted_to_user_id IS NULL);

-- Authenticated users can also see their own restricted codes
CREATE POLICY "Users can view own restricted discount codes"
  ON public.discount_codes
  FOR SELECT
  TO authenticated
  USING (restricted_to_user_id = auth.uid());

-- Staff can view all discount codes
CREATE POLICY "Staff can view all discount codes"
  ON public.discount_codes
  FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));
