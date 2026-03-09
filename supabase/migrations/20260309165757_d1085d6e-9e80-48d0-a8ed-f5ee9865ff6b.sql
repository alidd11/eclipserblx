
-- Custom pages for stores
CREATE TABLE public.store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT DEFAULT '',
  is_published BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own pages
CREATE POLICY "Store owners can manage their pages"
ON public.store_pages FOR ALL TO authenticated
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- Team members can manage pages
CREATE POLICY "Team members can manage pages"
ON public.store_pages FOR ALL TO authenticated
USING (public.is_store_team_member(store_id, auth.uid()))
WITH CHECK (public.is_store_team_member(store_id, auth.uid()));

-- Public can read published pages
CREATE POLICY "Public can read published pages"
ON public.store_pages FOR SELECT TO public
USING (is_published = true);

-- Navigation links for stores
CREATE TABLE public.store_nav_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT,
  link_type TEXT NOT NULL DEFAULT 'page',
  target_id UUID,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.store_nav_links ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own nav links
CREATE POLICY "Store owners can manage nav links"
ON public.store_nav_links FOR ALL TO authenticated
USING (public.is_store_owner(store_id, auth.uid()))
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

-- Team members can manage nav links
CREATE POLICY "Team members can manage nav links"
ON public.store_nav_links FOR ALL TO authenticated
USING (public.is_store_team_member(store_id, auth.uid()))
WITH CHECK (public.is_store_team_member(store_id, auth.uid()));

-- Public can read visible nav links
CREATE POLICY "Public can read visible nav links"
ON public.store_nav_links FOR SELECT TO public
USING (is_visible = true);

-- Add favicon and branding columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hide_branding BOOLEAN DEFAULT false;
