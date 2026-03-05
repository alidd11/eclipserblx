
-- Fix user_roles: own view from public → authenticated
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix audit_logs: staff insert from public → authenticated
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

-- Fix products policies from public → authenticated (keep public SELECT for active products)
DROP POLICY IF EXISTS "Admins can update any product" ON public.products;
CREATE POLICY "Admins can update any product" ON public.products
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lead_administrator'));

DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
CREATE POLICY "Sellers can create products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
CREATE POLICY "Sellers can delete own products" ON public.products
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
CREATE POLICY "Sellers can update own products" ON public.products
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Sellers can view own products" ON public.products;
CREATE POLICY "Sellers can view own products" ON public.products
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can delete any product" ON public.products;
CREATE POLICY "Staff can delete any product" ON public.products
  FOR DELETE TO authenticated USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view all products" ON public.products;
CREATE POLICY "Staff can view all products" ON public.products
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can view their purchased products" ON public.products;
CREATE POLICY "Users can view their purchased products" ON public.products
  FOR SELECT TO authenticated USING (user_has_purchased_product(auth.uid(), id));

-- Fix seller_support_tickets from public → authenticated
DROP POLICY IF EXISTS "Sellers can create tickets" ON public.seller_support_tickets;
CREATE POLICY "Sellers can create tickets" ON public.seller_support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update their own open tickets" ON public.seller_support_tickets;
CREATE POLICY "Sellers can update their own open tickets" ON public.seller_support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('open', 'awaiting_seller'));

DROP POLICY IF EXISTS "Sellers can view their own tickets" ON public.seller_support_tickets;
CREATE POLICY "Sellers can view their own tickets" ON public.seller_support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can update any ticket" ON public.seller_support_tickets;
CREATE POLICY "Staff can update any ticket" ON public.seller_support_tickets
  FOR UPDATE TO authenticated USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view all tickets" ON public.seller_support_tickets;
CREATE POLICY "Staff can view all tickets" ON public.seller_support_tickets
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Fix stores from public → authenticated (keep public SELECT for approved stores)
DROP POLICY IF EXISTS "Authenticated users can create stores" ON public.stores;
CREATE POLICY "Authenticated users can create stores" ON public.stores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own store" ON public.stores;
CREATE POLICY "Owners can update own store" ON public.stores
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can view own store" ON public.stores;
CREATE POLICY "Owners can view own store" ON public.stores
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Staff can manage stores" ON public.stores;
CREATE POLICY "Staff can manage stores" ON public.stores
  FOR ALL TO authenticated USING (is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view all stores" ON public.stores;
CREATE POLICY "Staff can view all stores" ON public.stores
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

-- Keep public view of approved stores for unauthenticated browsing
DROP POLICY IF EXISTS "Public can view approved store basic info" ON public.stores;
CREATE POLICY "Public can view approved stores" ON public.stores
  FOR SELECT TO public
  USING ((status = 'approved' AND is_active = true) OR auth.uid() = owner_id OR is_staff(auth.uid()));
