
-- Add roblox_universe_ids column to creator_ip_registry for game monitoring
ALTER TABLE public.creator_ip_registry
ADD COLUMN roblox_universe_ids text[] DEFAULT NULL;
