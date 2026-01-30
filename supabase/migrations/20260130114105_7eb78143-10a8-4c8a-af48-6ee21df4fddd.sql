-- Table to store Discord link verification codes
CREATE TABLE public.discord_link_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  discord_user_id TEXT NULL,
  discord_username TEXT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_discord_link_codes_code ON public.discord_link_codes(code);
CREATE INDEX idx_discord_link_codes_discord_user ON public.discord_link_codes(discord_user_id);
CREATE INDEX idx_discord_link_codes_expires ON public.discord_link_codes(expires_at);

-- Enable RLS
ALTER TABLE public.discord_link_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own link codes
CREATE POLICY "Users can view own link codes" ON public.discord_link_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own link codes
CREATE POLICY "Users can create own link codes" ON public.discord_link_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own link codes
CREATE POLICY "Users can update own link codes" ON public.discord_link_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to generate unique link code
CREATE OR REPLACE FUNCTION public.generate_discord_link_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));
    
    -- Check if code already exists (and hasn't expired)
    SELECT EXISTS(
      SELECT 1 FROM public.discord_link_codes 
      WHERE code = new_code AND expires_at > now()
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Cleanup old expired codes periodically
CREATE OR REPLACE FUNCTION public.cleanup_expired_link_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.discord_link_codes
  WHERE expires_at < now() - interval '1 day';
END;
$$;