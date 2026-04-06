
-- Step 1: Create new parent categories
INSERT INTO categories (id, name, slug, icon, display_order, parent_id)
VALUES
  (gen_random_uuid(), 'Vehicles', 'vehicles', 'Car', 1, NULL),
  (gen_random_uuid(), 'Models', 'models', 'Box', 2, NULL),
  (gen_random_uuid(), 'VFXs', 'vfxs', 'Sparkles', 3, NULL),
  (gen_random_uuid(), 'Gear', 'gear', 'Shirt', 4, NULL),
  (gen_random_uuid(), 'Misc', 'misc', 'Package', 5, NULL);

-- Step 2: Update display_order for existing parent categories that stay as parents
UPDATE categories SET display_order = 6 WHERE slug = 'maps';
UPDATE categories SET display_order = 7 WHERE slug = 'scripts-systems';
UPDATE categories SET display_order = 8 WHERE slug = 'buildings';
UPDATE categories SET display_order = 9 WHERE slug = 'aircraft';

-- Step 3: Re-parent vehicle subcategories under "Vehicles"
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 1
WHERE slug = 'civilian-vehicles';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 2
WHERE slug = 'marked-police-vehicles';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 3
WHERE slug = 'unmarked-police-vehicles';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 4
WHERE slug = 'ambulance-vehicles';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 5
WHERE slug = 'fire-vehicles';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'vehicles'), display_order = 6
WHERE slug = 'military-vehicles';

-- Step 4: Re-parent Uniforms under "Gear"
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'gear'), display_order = 1
WHERE slug = 'uniforms';

-- Step 5: Re-parent Misc children
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'misc'), display_order = 1
WHERE slug = 'bundle-deals';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'misc'), display_order = 2
WHERE slug = 'bots';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'misc'), display_order = 3
WHERE slug = 'roblox-bots';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'misc'), display_order = 4
WHERE slug = 'roblox-ui';

-- Step 6: Update UIs to be a standalone parent (rename Roblox UI is now under Misc, keep main UIs)
-- Note: "Roblox UI" stays as-is under Misc. The top-level "UIs" category doesn't exist yet,
-- so we skip creating it since the plan maps Roblox UI under Misc.
