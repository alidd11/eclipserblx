-- Add Discord Outreach permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('view_discord_outreach', 'View Discord outreach records and tracking', 'team'),
  ('manage_discord_outreach', 'Create, edit, and manage Discord outreach campaigns', 'team')
ON CONFLICT (name) DO NOTHING;

-- Assign to recruiter role by default
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'recruiter', id FROM public.permissions WHERE name IN ('view_discord_outreach', 'manage_discord_outreach')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Also assign to admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE name IN ('view_discord_outreach', 'manage_discord_outreach')
ON CONFLICT (role, permission_id) DO NOTHING;