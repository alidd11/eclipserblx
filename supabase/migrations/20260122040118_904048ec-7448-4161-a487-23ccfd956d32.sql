-- Add display_name_changed_at column to track cooldown
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name_changed_at TIMESTAMP WITH TIME ZONE;