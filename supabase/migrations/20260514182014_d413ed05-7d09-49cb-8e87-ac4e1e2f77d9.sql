-- 1) Add missing permission rows
INSERT INTO public.permissions (name, description) VALUES
  ('manage_categories', 'Create, edit, reorder, and delete marketplace categories'),
  ('view_categories',   'View the categories admin page')
ON CONFLICT (name) DO NOTHING;

-- 2) Assign new permissions to admin + lead_administrator
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.role, p.id
FROM (VALUES ('admin'), ('lead_administrator')) AS r(role)
CROSS JOIN public.permissions p
WHERE p.name IN ('manage_categories','view_categories')
ON CONFLICT DO NOTHING;

-- 3) Categories: add missing write policies
DROP POLICY IF EXISTS "Staff with manage_categories can insert" ON public.categories;
DROP POLICY IF EXISTS "Staff with manage_categories can update" ON public.categories;
DROP POLICY IF EXISTS "Staff with manage_categories can delete" ON public.categories;

CREATE POLICY "Staff with manage_categories can insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'manage_categories'));

CREATE POLICY "Staff with manage_categories can update"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_categories'))
  WITH CHECK (public.has_permission(auth.uid(), 'manage_categories'));

CREATE POLICY "Staff with manage_categories can delete"
  ON public.categories FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'manage_categories'));

-- 4) store_applications: replace broad ALL policy with permission-scoped UPDATE/DELETE
DROP POLICY IF EXISTS "Staff can manage applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can update applications" ON public.store_applications;
DROP POLICY IF EXISTS "Reviewers can delete applications" ON public.store_applications;

CREATE POLICY "Reviewers can update applications"
  ON public.store_applications FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'review_store_applications'))
  WITH CHECK (public.has_permission(auth.uid(), 'review_store_applications'));

CREATE POLICY "Reviewers can delete applications"
  ON public.store_applications FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'review_store_applications'));