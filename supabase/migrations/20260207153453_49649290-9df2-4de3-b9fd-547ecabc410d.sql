-- Create download tokens table for one-time use links
CREATE TABLE public.download_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  signed_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast token lookup
CREATE INDEX idx_download_tokens_token ON public.download_tokens(token);
CREATE INDEX idx_download_tokens_expires_at ON public.download_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens (edge function uses service role)
CREATE POLICY "Service role manages download tokens"
  ON public.download_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_download_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.download_tokens
  WHERE expires_at < now() - interval '1 hour';
END;
$$;