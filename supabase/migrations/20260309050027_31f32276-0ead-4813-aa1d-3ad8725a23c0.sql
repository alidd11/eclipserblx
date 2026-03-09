
-- Store domains table
CREATE TABLE public.store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  domain_type text NOT NULL DEFAULT 'subdomain' CHECK (domain_type IN ('subdomain', 'custom')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'active', 'failed', 'removed')),
  verification_token text DEFAULT encode(gen_random_bytes(16), 'hex'),
  verified_at timestamptz,
  ssl_status text NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  is_primary boolean NOT NULL DEFAULT true,
  cloudflare_hostname_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Store domain billing table
CREATE TABLE public.store_domain_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_domain_id uuid NOT NULL REFERENCES public.store_domains(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_store_domains_store_id ON public.store_domains(store_id);
CREATE INDEX idx_store_domains_domain ON public.store_domains(domain);
CREATE INDEX idx_store_domains_status ON public.store_domains(status);
CREATE INDEX idx_store_domain_billing_domain_id ON public.store_domain_billing(store_domain_id);

-- Enable RLS
ALTER TABLE public.store_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_domain_billing ENABLE ROW LEVEL SECURITY;

-- RLS: Public can read active domains (needed for hostname lookup)
CREATE POLICY "Anyone can read active domains"
  ON public.store_domains FOR SELECT
  TO public
  USING (status = 'active');

-- RLS: Store owners can read their own domains
CREATE POLICY "Store owners can read own domains"
  ON public.store_domains FOR SELECT
  TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()));

-- RLS: Store owners can insert domains for their stores
CREATE POLICY "Store owners can create domains"
  ON public.store_domains FOR INSERT
  TO authenticated
  WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- RLS: Store owners can update their own domains
CREATE POLICY "Store owners can update own domains"
  ON public.store_domains FOR UPDATE
  TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()));

-- RLS: Store owners can delete their own domains
CREATE POLICY "Store owners can delete own domains"
  ON public.store_domains FOR DELETE
  TO authenticated
  USING (public.is_store_owner(store_id, auth.uid()));

-- RLS: Staff can manage all domains
CREATE POLICY "Staff can manage all domains"
  ON public.store_domains FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  );

-- RLS: Store owners can read own billing
CREATE POLICY "Store owners can read own billing"
  ON public.store_domain_billing FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_domains sd
      WHERE sd.id = store_domain_id
      AND public.is_store_owner(sd.store_id, auth.uid())
    )
  );

-- RLS: Staff can manage all billing
CREATE POLICY "Staff can manage all billing"
  ON public.store_domain_billing FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  );
