-- Fix phantom permissions: these permission names are referenced in
-- has_permission() RLS checks but were never inserted into
-- public.permissions, so those checks have always evaluated to false
-- for every role, including admin. This silently hides/blocks data
-- (e.g. seller payouts, affiliate payouts, and payment details needed
-- to process them) with no error.

INSERT INTO public.permissions (name, description, category) VALUES
  ('manage_payouts', 'Process and manage seller and affiliate payouts, and view the payment details needed to send them', 'payouts'),
  ('manage_seller_documents', 'Upload, edit, and delete seller verification documents', 'team'),
  ('manage_advertisements', 'View and manage all advertisement schedule slots', 'marketing')
ON CONFLICT (name) DO NOTHING;

-- Grant to admin and lead_administrator (existing top-level staff roles)
INSERT INTO public.role_permissions (role, permission_id)
SELECT r.name, p.id
FROM public.custom_roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('admin', 'lead_administrator')
  AND p.name IN ('manage_payouts', 'manage_seller_documents', 'manage_advertisements')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Also grant manage_payouts to lead_manager (formerly order_manager), which
-- already holds view_seller_payouts + process_payouts and is the role that
-- operationally handles payouts day to day.
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'lead_manager', p.id
FROM public.permissions p
WHERE p.name = 'manage_payouts'
ON CONFLICT (role, permission_id) DO NOTHING;