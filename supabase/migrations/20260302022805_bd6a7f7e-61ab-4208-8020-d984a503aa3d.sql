-- Add attempts column to track brute-force attempts on password reset codes
ALTER TABLE public.password_reset_codes 
ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;