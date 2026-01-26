-- Create promotions table for special offers like free Eclipse+ trials
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('signup_eclipse_plus', 'first_purchase_eclipse_plus', 'discount_code')),
    -- For Eclipse+ promotions
    eclipse_plus_days INTEGER DEFAULT 30,
    -- For discount promotions  
    discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
    -- Promotion settings
    is_active BOOLEAN DEFAULT false,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    max_claims INTEGER,
    current_claims INTEGER DEFAULT 0,
    -- Eligibility
    new_users_only BOOLEAN DEFAULT true,
    require_email_verified BOOLEAN DEFAULT false,
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID
);

-- Track promotion claims to prevent abuse
CREATE TABLE public.promotion_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Result of claim
    subscription_id UUID REFERENCES public.subscriptions(user_id) ON DELETE SET NULL,
    discount_code_id UUID REFERENCES public.discount_codes(id) ON DELETE SET NULL,
    CONSTRAINT unique_promotion_claim UNIQUE (promotion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for promotions (admin only for write, public for read active ones)
CREATE POLICY "Staff can view all promotions"
    ON public.promotions FOR SELECT
    TO authenticated
    USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can manage promotions"
    ON public.promotions FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for promotion claims
CREATE POLICY "Users can view their own claims"
    ON public.promotion_claims FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admin can view all claims"
    ON public.promotion_claims FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can claim promotions"
    ON public.promotion_claims FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_promotions_active ON public.promotions(is_active, starts_at, ends_at);
CREATE INDEX idx_promotion_claims_user ON public.promotion_claims(user_id);
CREATE INDEX idx_promotion_claims_promotion ON public.promotion_claims(promotion_id);

-- Add to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;