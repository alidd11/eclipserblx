-- Create download_logs table to track all downloads
CREATE TABLE public.download_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_download_logs_user_id ON public.download_logs(user_id);
CREATE INDEX idx_download_logs_product_id ON public.download_logs(product_id);
CREATE INDEX idx_download_logs_downloaded_at ON public.download_logs(downloaded_at DESC);

-- Enable RLS
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own download history
CREATE POLICY "Users can view their own downloads"
ON public.download_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own download logs (controlled by edge function)
CREATE POLICY "Users can log their own downloads"
ON public.download_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Staff can view all download logs
CREATE POLICY "Staff can view all download logs"
ON public.download_logs
FOR SELECT
USING (is_staff(auth.uid()));

-- Function to check if user can download (last download was 48+ hours ago)
CREATE OR REPLACE FUNCTION public.can_user_download(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.download_logs
    WHERE user_id = _user_id
      AND downloaded_at > (now() - INTERVAL '48 hours')
  )
$$;

-- Function to get time until next download
CREATE OR REPLACE FUNCTION public.get_next_download_time(_user_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT downloaded_at + INTERVAL '48 hours'
  FROM public.download_logs
  WHERE user_id = _user_id
    AND downloaded_at > (now() - INTERVAL '48 hours')
  ORDER BY downloaded_at DESC
  LIMIT 1
$$;