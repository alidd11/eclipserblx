
-- Store team permissions
CREATE TABLE public.store_team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, role, permission)
);
ALTER TABLE public.store_team_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owner full access" ON public.store_team_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_team_permissions.store_id AND owner_id = auth.uid()));
CREATE POLICY "Team members can view perms" ON public.store_team_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_team_members WHERE store_team_members.store_id = store_team_permissions.store_id AND store_team_members.user_id = auth.uid() AND store_team_members.accepted_at IS NOT NULL));

-- Welcome embed settings for sellers
CREATE TABLE public.store_welcome_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  title TEXT DEFAULT 'Welcome!',
  description TEXT DEFAULT 'Welcome to our server!',
  color TEXT DEFAULT '#7C3AED',
  thumbnail_url TEXT,
  image_url TEXT,
  footer_text TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_welcome_embeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage welcome embeds" ON public.store_welcome_embeds FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_welcome_embeds.store_id AND owner_id = auth.uid()));
CREATE POLICY "Team can view welcome embeds" ON public.store_welcome_embeds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_team_members WHERE store_team_members.store_id = store_welcome_embeds.store_id AND store_team_members.user_id = auth.uid() AND store_team_members.accepted_at IS NOT NULL));

-- Storage bucket for internal notes
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('internal-note-attachments', 'internal-note-attachments', false, 10485760)
ON CONFLICT (id) DO NOTHING;
