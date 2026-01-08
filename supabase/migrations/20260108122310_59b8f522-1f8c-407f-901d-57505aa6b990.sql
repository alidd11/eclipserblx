-- Create IP bans table
CREATE TABLE public.ip_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  reason text,
  banned_by uuid NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Add unique constraint on IP address
CREATE UNIQUE INDEX idx_ip_bans_ip_address ON public.ip_bans(ip_address);

-- Enable RLS
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage IP bans
CREATE POLICY "Admins can manage IP bans"
ON public.ip_bans
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can check if an IP is banned (for middleware use)
CREATE POLICY "Anyone can check IP bans"
ON public.ip_bans
FOR SELECT
USING (true);