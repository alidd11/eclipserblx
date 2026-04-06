
-- Changelog entries table
CREATE TABLE public.changelog_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feature',
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can read published entries
CREATE POLICY "Published changelogs are public"
  ON public.changelog_entries FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- Staff can do everything
CREATE POLICY "Staff can manage changelogs"
  ON public.changelog_entries FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Scheduled maintenance columns on incidents
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_end TIMESTAMPTZ;
