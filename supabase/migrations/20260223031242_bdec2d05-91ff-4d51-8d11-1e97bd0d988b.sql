
-- Add Roblox UI category
INSERT INTO public.categories (name, slug, description, display_order)
VALUES ('Roblox UI', 'roblox-ui', 'Roblox user interface products', 14);

-- Add column to track which products have been posted to category feed channels
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS feed_notified_at timestamptz DEFAULT NULL;
