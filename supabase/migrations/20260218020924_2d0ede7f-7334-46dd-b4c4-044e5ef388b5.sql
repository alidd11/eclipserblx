
-- 1. Store Announcements - sellers can push messages to followers
CREATE TABLE public.store_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- general, sale, new_product, update
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.store_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements"
ON public.store_announcements FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage announcements"
ON public.store_announcements FOR ALL
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- 2. Refund Requests - customers request, sellers handle, escalation to Eclipse
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  order_item_id UUID REFERENCES public.order_items(id),
  customer_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  reason TEXT NOT NULL,
  details TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied, escalated, resolved
  seller_response TEXT,
  seller_responded_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  admin_response TEXT,
  admin_resolved_at TIMESTAMPTZ,
  admin_resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own refund requests"
ON public.refund_requests FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "Customers can create refund requests"
ON public.refund_requests FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can escalate their requests"
ON public.refund_requests FOR UPDATE
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Sellers can view refund requests for their store"
ON public.refund_requests FOR SELECT
USING (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Sellers can respond to refund requests"
ON public.refund_requests FOR UPDATE
USING (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Staff can view all refund requests"
ON public.refund_requests FOR SELECT
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage all refund requests"
ON public.refund_requests FOR UPDATE
USING (public.is_staff(auth.uid()));

-- 3. Flash Sales - time-limited sales
CREATE TABLE public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  discount_value NUMERIC NOT NULL,
  product_ids UUID[],
  apply_to_all BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active flash sales"
ON public.flash_sales FOR SELECT
USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "Store owners can manage flash sales"
ON public.flash_sales FOR ALL
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Staff can view all flash sales"
ON public.flash_sales FOR SELECT
USING (public.is_staff(auth.uid()));

-- 4. Product Bundles - grouped products at discounted price
CREATE TABLE public.product_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  product_ids UUID[] NOT NULL,
  bundle_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  savings_percent NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_purchases INTEGER,
  current_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles"
ON public.product_bundles FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage bundles"
ON public.product_bundles FOR ALL
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Staff can view all bundles"
ON public.product_bundles FOR SELECT
USING (public.is_staff(auth.uid()));

-- Add RLS for store_follows so sellers can see their followers
CREATE POLICY "Store owners can view their followers"
ON public.store_follows FOR SELECT
USING (public.is_store_owner(store_id, auth.uid()));
