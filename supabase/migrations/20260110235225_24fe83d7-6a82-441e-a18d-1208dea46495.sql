-- =============================================
-- RATE LIMITING FOR PUBLIC FORMS
-- =============================================

-- 1. Create rate_limits table to track submissions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or email
  action_type text NOT NULL, -- 'contact_form', 'job_application'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow inserts (no reads/updates/deletes from client)
CREATE POLICY "Anyone can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
TO public
WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_identifier_action ON public.rate_limits(identifier, action_type, created_at DESC);

-- Auto-cleanup old entries (keep last 24 hours)
CREATE INDEX idx_rate_limits_created_at ON public.rate_limits(created_at);

-- 2. Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_requests integer DEFAULT 5,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND created_at > (now() - (p_window_minutes || ' minutes')::interval);
  
  -- Return true if under limit
  RETURN request_count < p_max_requests;
END;
$$;

-- 3. Create function to record rate limit entry
CREATE OR REPLACE FUNCTION public.record_rate_limit(
  p_identifier text,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limits (identifier, action_type)
  VALUES (p_identifier, p_action_type);
  
  -- Cleanup old entries (older than 24 hours) occasionally
  IF random() < 0.01 THEN -- 1% chance to cleanup
    DELETE FROM public.rate_limits
    WHERE created_at < (now() - interval '24 hours');
  END IF;
END;
$$;

-- 4. Update contact_messages INSERT policy with rate limiting
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact messages with rate limit" 
ON public.contact_messages 
FOR INSERT 
TO public
WITH CHECK (
  -- Validate required fields
  name IS NOT NULL AND name <> '' AND
  email IS NOT NULL AND email <> '' AND
  subject IS NOT NULL AND subject <> '' AND
  message IS NOT NULL AND message <> '' AND
  -- Ensure status defaults are respected
  (status IS NULL OR status = 'new' OR status = 'unread') AND
  -- Prevent setting staff-only fields
  responded_at IS NULL AND
  responded_by IS NULL AND
  notes IS NULL AND
  -- Rate limit: 5 submissions per hour per email
  check_rate_limit(email, 'contact_form', 5, 60)
);

-- 5. Update job_applications INSERT policy with rate limiting
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.job_applications;

CREATE POLICY "Anyone can submit applications with rate limit" 
ON public.job_applications 
FOR INSERT 
TO public
WITH CHECK (
  -- Existing validations
  status = 'pending' AND
  reviewed_at IS NULL AND
  reviewed_by IS NULL AND
  notes IS NULL AND
  -- Validate required fields
  applicant_name IS NOT NULL AND applicant_name <> '' AND
  applicant_email IS NOT NULL AND applicant_email <> '' AND
  position IS NOT NULL AND position <> '' AND
  message IS NOT NULL AND message <> '' AND
  -- Rate limit: 3 applications per day per email
  check_rate_limit(applicant_email, 'job_application', 3, 1440)
);