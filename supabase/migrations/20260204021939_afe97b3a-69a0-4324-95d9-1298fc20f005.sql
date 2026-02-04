
-- Add 'seller' role to custom_roles for marketplace sellers
INSERT INTO public.custom_roles (name, display_name, description, icon, color, hierarchy_level, is_system)
VALUES (
  'seller',
  'Seller',
  'Marketplace seller with store management access',
  'Store',
  '#10b981',
  10,
  true
)
ON CONFLICT (name) DO NOTHING;
