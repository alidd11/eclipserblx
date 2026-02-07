-- =============================================
-- SELLER RECRUITER PROGRAM DATABASE SCHEMA
-- =============================================

-- Function to generate unique recruiter ID
CREATE OR REPLACE FUNCTION public.generate_recruiter_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'REC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM recruiter_applications WHERE recruiter_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$;

-- =============================================
-- 1. RECRUITER APPLICATIONS TABLE
-- =============================================
CREATE TABLE public.recruiter_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recruiter_id TEXT UNIQUE,
  display_name TEXT,
  discord_username TEXT,
  email TEXT,
  promotion_method TEXT NOT NULL,
  expected_servers TEXT,
  paypal_email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Trigger to auto-generate recruiter ID
CREATE OR REPLACE FUNCTION public.set_recruiter_application_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recruiter_id IS NULL THEN
    NEW.recruiter_id := generate_recruiter_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_recruiter_id_trigger
BEFORE INSERT ON public.recruiter_applications
FOR EACH ROW EXECUTE FUNCTION set_recruiter_application_id();

-- RLS for recruiter_applications
ALTER TABLE public.recruiter_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application"
ON public.recruiter_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own application"
ON public.recruiter_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all applications"
ON public.recruiter_applications FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update applications"
ON public.recruiter_applications FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- =============================================
-- 2. RECRUITER BALANCES TABLE
-- =============================================
CREATE TABLE public.recruiter_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_earned NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  available_balance NUMERIC DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  qualified_referrals INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for recruiter_balances
ALTER TABLE public.recruiter_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balance"
ON public.recruiter_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all balances"
ON public.recruiter_balances FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage balances"
ON public.recruiter_balances FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- =============================================
-- 3. RECRUITER COMMISSIONS TABLE
-- =============================================
CREATE TABLE public.recruiter_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  store_application_id UUID,
  server_name TEXT NOT NULL,
  discord_invite TEXT,
  member_count INTEGER,
  commission_amount NUMERIC NOT NULL,
  commission_tier TEXT CHECK (commission_tier IN ('basic', 'standard', 'premium', 'elite')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'paid', 'rejected')),
  qualified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payout_id UUID,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for recruiter_commissions
ALTER TABLE public.recruiter_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters can view their own commissions"
ON public.recruiter_commissions FOR SELECT
TO authenticated
USING (auth.uid() = recruiter_id);

CREATE POLICY "Staff can view all commissions"
ON public.recruiter_commissions FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage commissions"
ON public.recruiter_commissions FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- =============================================
-- 4. RECRUITER PAYOUTS TABLE
-- =============================================
CREATE TABLE public.recruiter_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'paypal',
  payment_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for recruiter_payouts
ALTER TABLE public.recruiter_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts"
ON public.recruiter_payouts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can request payouts"
ON public.recruiter_payouts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all payouts"
ON public.recruiter_payouts FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage payouts"
ON public.recruiter_payouts FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()));

-- =============================================
-- 5. ADD COLUMNS TO STORE_APPLICATIONS
-- =============================================
ALTER TABLE public.store_applications
ADD COLUMN IF NOT EXISTS recruiter_code TEXT,
ADD COLUMN IF NOT EXISTS recruited_by UUID REFERENCES auth.users(id);

-- =============================================
-- 6. ADD COLUMNS TO STORES
-- =============================================
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS recruited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS recruiter_commission_paid BOOLEAN DEFAULT false;

-- =============================================
-- 7. COMMISSION ELIGIBILITY CHECK FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.check_recruiter_commission_eligibility(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_count INTEGER;
  v_store_active BOOLEAN;
  v_approved_at TIMESTAMPTZ;
BEGIN
  -- Get store details
  SELECT is_active, approved_at INTO v_store_active, v_approved_at
  FROM stores WHERE id = p_store_id;
  
  -- If store not found, return false
  IF v_store_active IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Count approved products
  SELECT COUNT(*) INTO v_product_count
  FROM products WHERE store_id = p_store_id AND status = 'approved';
  
  -- Check all criteria:
  -- 1. Store is active
  -- 2. At least 10 products
  -- 3. Running for 7+ days
  RETURN v_store_active = true 
    AND v_product_count >= 10 
    AND v_approved_at IS NOT NULL
    AND v_approved_at <= now() - interval '7 days';
END;
$$;

-- =============================================
-- 8. GET STORE QUALIFICATION PROGRESS
-- =============================================
CREATE OR REPLACE FUNCTION public.get_store_qualification_progress(p_store_id UUID)
RETURNS TABLE (
  product_count INTEGER,
  required_products INTEGER,
  days_active INTEGER,
  required_days INTEGER,
  is_active BOOLEAN,
  is_qualified BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_count INTEGER;
  v_store_active BOOLEAN;
  v_approved_at TIMESTAMPTZ;
  v_days_active INTEGER;
BEGIN
  -- Get store details
  SELECT s.is_active, s.approved_at INTO v_store_active, v_approved_at
  FROM stores s WHERE s.id = p_store_id;
  
  -- Count approved products
  SELECT COUNT(*) INTO v_product_count
  FROM products WHERE store_id = p_store_id AND status = 'approved';
  
  -- Calculate days active
  IF v_approved_at IS NOT NULL THEN
    v_days_active := EXTRACT(DAY FROM (now() - v_approved_at))::INTEGER;
  ELSE
    v_days_active := 0;
  END IF;
  
  RETURN QUERY SELECT 
    v_product_count,
    10,
    v_days_active,
    7,
    COALESCE(v_store_active, false),
    public.check_recruiter_commission_eligibility(p_store_id);
END;
$$;

-- =============================================
-- 9. UPDATE BALANCE AFTER COMMISSION QUALIFIED
-- =============================================
CREATE OR REPLACE FUNCTION public.update_recruiter_balance_on_qualification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'qualified' AND OLD.status = 'pending' THEN
    -- Update or create balance record
    INSERT INTO public.recruiter_balances (user_id, total_earned, available_balance, qualified_referrals)
    VALUES (NEW.recruiter_id, NEW.commission_amount, NEW.commission_amount, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_earned = recruiter_balances.total_earned + NEW.commission_amount,
      available_balance = recruiter_balances.available_balance + NEW.commission_amount,
      qualified_referrals = recruiter_balances.qualified_referrals + 1,
      updated_at = now();
    
    -- Set qualified timestamp
    NEW.qualified_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_balance_on_commission_qualified
BEFORE UPDATE ON public.recruiter_commissions
FOR EACH ROW
WHEN (NEW.status = 'qualified' AND OLD.status = 'pending')
EXECUTE FUNCTION update_recruiter_balance_on_qualification();

-- =============================================
-- 10. UPDATE BALANCE AFTER PAYOUT COMPLETED
-- =============================================
CREATE OR REPLACE FUNCTION public.update_recruiter_balance_after_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.recruiter_balances
    SET 
      total_paid = total_paid + NEW.amount,
      available_balance = available_balance - NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_balance_after_payout
AFTER UPDATE ON public.recruiter_payouts
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_recruiter_balance_after_payout();

-- =============================================
-- 11. INCREMENT REFERRAL COUNT ON COMMISSION CREATE
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_recruiter_referral_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.recruiter_balances (user_id, total_referrals)
  VALUES (NEW.recruiter_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = recruiter_balances.total_referrals + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_referral_on_commission
AFTER INSERT ON public.recruiter_commissions
FOR EACH ROW
EXECUTE FUNCTION increment_recruiter_referral_count();

-- =============================================
-- 12. ASSIGN RECRUITER ROLE ON APPROVAL
-- =============================================
CREATE OR REPLACE FUNCTION public.assign_recruiter_role_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Assign recruiter role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'recruiter')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Set reviewed timestamp
    NEW.reviewed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_role_on_recruiter_approval
BEFORE UPDATE ON public.recruiter_applications
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
EXECUTE FUNCTION assign_recruiter_role_on_approval();

-- =============================================
-- 13. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_recruiter_applications_user_id ON public.recruiter_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_applications_status ON public.recruiter_applications(status);
CREATE INDEX IF NOT EXISTS idx_recruiter_commissions_recruiter_id ON public.recruiter_commissions(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_commissions_store_id ON public.recruiter_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_commissions_status ON public.recruiter_commissions(status);
CREATE INDEX IF NOT EXISTS idx_recruiter_payouts_user_id ON public.recruiter_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_payouts_status ON public.recruiter_payouts(status);
CREATE INDEX IF NOT EXISTS idx_store_applications_recruiter_code ON public.store_applications(recruiter_code);
CREATE INDEX IF NOT EXISTS idx_stores_recruited_by ON public.stores(recruited_by);