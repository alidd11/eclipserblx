-- Phase 1: Multi-Vendor Marketplace Database Schema

-- =====================================================
-- 1. STORES TABLE - Seller Store Information
-- =====================================================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  store_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  
  -- Stripe Connect
  stripe_account_id TEXT,
  payouts_enabled BOOLEAN DEFAULT false,
  
  -- Store settings
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  
  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Stats (denormalized for performance)
  total_sales INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  product_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generate unique store IDs
CREATE OR REPLACE FUNCTION public.generate_store_id() 
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
    new_id := 'STR-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
    SELECT EXISTS(SELECT 1 FROM stores WHERE store_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$;

-- Auto-generate store_id on insert
CREATE OR REPLACE FUNCTION public.set_store_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.store_id IS NULL THEN
    NEW.store_id := generate_store_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_store_id_trigger
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION set_store_id();

-- Updated at trigger
CREATE TRIGGER update_stores_updated_at
BEFORE UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX idx_stores_status ON public.stores(status);
CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_stores_is_active ON public.stores(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved active stores
CREATE POLICY "Anyone can view approved stores"
ON public.stores FOR SELECT
USING (status = 'approved' AND is_active = true);

-- Store owners can view their own store (any status)
CREATE POLICY "Owners can view own store"
ON public.stores FOR SELECT
USING (auth.uid() = owner_id);

-- Store owners can update their own store
CREATE POLICY "Owners can update own store"
ON public.stores FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Staff can view all stores
CREATE POLICY "Staff can view all stores"
ON public.stores FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can manage all stores
CREATE POLICY "Staff can manage stores"
ON public.stores FOR ALL
USING (public.is_staff(auth.uid()));

-- Authenticated users can create stores
CREATE POLICY "Authenticated users can create stores"
ON public.stores FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- =====================================================
-- 2. STORE APPLICATIONS TABLE
-- =====================================================
CREATE TABLE public.store_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  
  -- Application details
  store_name TEXT NOT NULL,
  store_description TEXT,
  product_category TEXT,
  expected_products TEXT,
  portfolio_url TEXT,
  experience TEXT,
  
  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Only one pending application per user
  CONSTRAINT unique_pending_application UNIQUE (user_id, status)
);

CREATE TRIGGER update_store_applications_updated_at
BEFORE UPDATE ON public.store_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_store_applications_user_id ON public.store_applications(user_id);
CREATE INDEX idx_store_applications_status ON public.store_applications(status);

ALTER TABLE public.store_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
ON public.store_applications FOR SELECT
USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
ON public.store_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Staff can view all applications
CREATE POLICY "Staff can view all applications"
ON public.store_applications FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can manage applications
CREATE POLICY "Staff can manage applications"
ON public.store_applications FOR ALL
USING (public.is_staff(auth.uid()));

-- =====================================================
-- 3. SELLER BALANCES TABLE
-- =====================================================
CREATE TABLE public.seller_balances (
  user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  available_balance DECIMAL(12,2) DEFAULT 0,
  pending_balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seller_balances_store_id ON public.seller_balances(store_id);

ALTER TABLE public.seller_balances ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own balance
CREATE POLICY "Sellers can view own balance"
ON public.seller_balances FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all balances
CREATE POLICY "Staff can view all balances"
ON public.seller_balances FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can manage balances
CREATE POLICY "Staff can manage balances"
ON public.seller_balances FOR ALL
USING (public.is_staff(auth.uid()));

-- =====================================================
-- 4. SELLER TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE public.seller_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(user_id),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  
  type TEXT NOT NULL CHECK (type IN ('sale', 'payout', 'refund', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seller_transactions_seller_id ON public.seller_transactions(seller_id);
CREATE INDEX idx_seller_transactions_store_id ON public.seller_transactions(store_id);
CREATE INDEX idx_seller_transactions_order_id ON public.seller_transactions(order_id);
CREATE INDEX idx_seller_transactions_type ON public.seller_transactions(type);
CREATE INDEX idx_seller_transactions_created_at ON public.seller_transactions(created_at);

ALTER TABLE public.seller_transactions ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own transactions
CREATE POLICY "Sellers can view own transactions"
ON public.seller_transactions FOR SELECT
USING (auth.uid() = seller_id);

-- Staff can view all transactions
CREATE POLICY "Staff can view all transactions"
ON public.seller_transactions FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can manage transactions
CREATE POLICY "Staff can manage transactions"
ON public.seller_transactions FOR ALL
USING (public.is_staff(auth.uid()));

-- =====================================================
-- 5. SELLER PAYOUTS TABLE
-- =====================================================
CREATE TABLE public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(user_id),
  store_id UUID NOT NULL REFERENCES stores(id),
  amount DECIMAL(10,2) NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seller_payouts_seller_id ON public.seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_status ON public.seller_payouts(status);

ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own payouts
CREATE POLICY "Sellers can view own payouts"
ON public.seller_payouts FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can request payouts
CREATE POLICY "Sellers can request payouts"
ON public.seller_payouts FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Staff can view all payouts
CREATE POLICY "Staff can view all payouts"
ON public.seller_payouts FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can manage payouts
CREATE POLICY "Staff can manage payouts"
ON public.seller_payouts FOR ALL
USING (public.is_staff(auth.uid()));

-- =====================================================
-- 6. ADD SELLER COLUMNS TO PRODUCTS TABLE
-- =====================================================
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
  ADD COLUMN IF NOT EXISTS is_seller_product BOOLEAN DEFAULT false;

CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_moderation_status ON public.products(moderation_status);
CREATE INDEX idx_products_is_seller_product ON public.products(is_seller_product) WHERE is_seller_product = true;

-- Update products RLS to allow sellers to manage their products
CREATE POLICY "Sellers can view own products"
ON public.products FOR SELECT
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

CREATE POLICY "Sellers can create products"
ON public.products FOR INSERT
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid() AND status = 'approved')
);

CREATE POLICY "Sellers can update own products"
ON public.products FOR UPDATE
USING (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
);

-- =====================================================
-- 7. ENABLE REALTIME FOR MARKETPLACE TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_transactions;