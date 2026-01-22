-- Add discord server invite to store applications
ALTER TABLE public.store_applications 
ADD COLUMN IF NOT EXISTS discord_server_invite text;

-- Add accounts locked fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS accounts_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accounts_locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS accounts_lock_reset_by uuid,
ADD COLUMN IF NOT EXISTS accounts_lock_reset_at timestamp with time zone;