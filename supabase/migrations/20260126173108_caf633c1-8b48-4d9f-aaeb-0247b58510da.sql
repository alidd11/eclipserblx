-- Create discord_advertisements table for paid advertisement system
CREATE TABLE public.discord_advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  discord_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'posted', 'failed')),
  payment_id TEXT,
  price_paid NUMERIC(10,2),
  posted_at TIMESTAMP WITH TIME ZONE,
  discord_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discord_advertisements ENABLE ROW LEVEL SECURITY;

-- Users can insert their own advertisements
CREATE POLICY "Users can insert their own advertisements"
ON public.discord_advertisements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own advertisements
CREATE POLICY "Users can view their own advertisements"
ON public.discord_advertisements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Staff can view all advertisements
CREATE POLICY "Staff can view all advertisements"
ON public.discord_advertisements
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can update all advertisements
CREATE POLICY "Staff can update all advertisements"
ON public.discord_advertisements
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_discord_advertisements_updated_at
BEFORE UPDATE ON public.discord_advertisements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for user lookups
CREATE INDEX idx_discord_advertisements_user_id ON public.discord_advertisements(user_id);
CREATE INDEX idx_discord_advertisements_status ON public.discord_advertisements(status);