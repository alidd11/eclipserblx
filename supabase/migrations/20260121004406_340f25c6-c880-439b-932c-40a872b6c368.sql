-- Add unique constraint on store name to prevent duplicates
ALTER TABLE public.stores ADD CONSTRAINT stores_name_unique UNIQUE (name);