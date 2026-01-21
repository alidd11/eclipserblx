-- Create marketplace feature flag for controlled rollout
INSERT INTO public.feature_flags (name, description, enabled, user_ids)
VALUES (
  'marketplace',
  'Eclipse Marketplace - store discovery and featured products',
  true,
  ARRAY['9b70ccd6-da02-4d53-8180-e884e1d18b3f']::uuid[]
)
ON CONFLICT (name) DO UPDATE SET
  user_ids = ARRAY['9b70ccd6-da02-4d53-8180-e884e1d18b3f']::uuid[],
  enabled = true;