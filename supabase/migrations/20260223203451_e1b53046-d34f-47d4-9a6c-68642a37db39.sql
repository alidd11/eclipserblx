
-- Reorder categories: Vehicles grouped, then other types
UPDATE categories SET display_order = 0 WHERE slug = 'civilian-vehicles';
UPDATE categories SET display_order = 1 WHERE slug = 'marked-police-vehicles';
UPDATE categories SET display_order = 2 WHERE slug = 'unmarked-police-vehicles';
UPDATE categories SET display_order = 3 WHERE slug = 'ambulance-vehicles';
UPDATE categories SET display_order = 4 WHERE slug = 'fire-vehicles';
UPDATE categories SET display_order = 5 WHERE slug = 'military-vehicles';
UPDATE categories SET display_order = 6 WHERE slug = 'aircraft';
UPDATE categories SET display_order = 7 WHERE slug = 'buildings';
UPDATE categories SET display_order = 8 WHERE slug = 'maps';
UPDATE categories SET display_order = 9 WHERE slug = 'uniforms';
UPDATE categories SET display_order = 10 WHERE slug = 'scripts-systems';
UPDATE categories SET display_order = 11 WHERE slug = 'roblox-ui';
UPDATE categories SET display_order = 12 WHERE slug = 'roblox-bots';
UPDATE categories SET display_order = 13 WHERE slug = 'bundle-deals';
UPDATE categories SET display_order = 14 WHERE slug = 'bots';
