-- Create bot_installation_codes table for unique one-time verification
CREATE TABLE public.bot_installation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  user_id UUID,
  installation_code TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Enable RLS
ALTER TABLE public.bot_installation_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own installation codes
CREATE POLICY "Users can view their own installation codes"
ON public.bot_installation_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Staff can view all installation codes
CREATE POLICY "Staff can view all installation codes"
ON public.bot_installation_codes
FOR SELECT
USING (public.is_staff(auth.uid()));

-- Staff can update installation codes (mark as used)
CREATE POLICY "Staff can update installation codes"
ON public.bot_installation_codes
FOR UPDATE
USING (public.is_staff(auth.uid()));

-- Create function to generate unique installation code
CREATE OR REPLACE FUNCTION public.generate_installation_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: BOT-XXXX-XXXX-XXXX (12 alphanumeric chars)
    new_code := 'BOT-' || 
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)) || '-' ||
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.bot_installation_codes WHERE installation_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create index for faster lookups
CREATE INDEX idx_bot_installation_codes_code ON public.bot_installation_codes(installation_code);
CREATE INDEX idx_bot_installation_codes_user ON public.bot_installation_codes(user_id);
CREATE INDEX idx_bot_installation_codes_order ON public.bot_installation_codes(order_id);