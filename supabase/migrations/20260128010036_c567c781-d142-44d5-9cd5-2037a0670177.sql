-- Insert 24 regional sub-categories for vehicle types and uniforms
-- Using existing parent_id column to establish hierarchy

-- Civilian Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Civilian Vehicles', 'uk-civilian-vehicles', 'British civilian vehicles', (SELECT id FROM categories WHERE slug = 'civilian-vehicles'), 100, 'Car'),
  ('US Civilian Vehicles', 'us-civilian-vehicles', 'American civilian vehicles', (SELECT id FROM categories WHERE slug = 'civilian-vehicles'), 101, 'Car'),
  ('EU Civilian Vehicles', 'eu-civilian-vehicles', 'European civilian vehicles', (SELECT id FROM categories WHERE slug = 'civilian-vehicles'), 102, 'Car');

-- Marked Police Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Police Vehicles', 'uk-police-vehicles', 'British police liveries and vehicles', (SELECT id FROM categories WHERE slug = 'marked-police-vehicles'), 103, 'Car'),
  ('US Police Vehicles', 'us-police-vehicles', 'American law enforcement vehicles', (SELECT id FROM categories WHERE slug = 'marked-police-vehicles'), 104, 'Car'),
  ('EU Police Vehicles', 'eu-police-vehicles', 'European police vehicles', (SELECT id FROM categories WHERE slug = 'marked-police-vehicles'), 105, 'Car');

-- Unmarked Police Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Unmarked Police', 'uk-unmarked-police', 'British unmarked police vehicles', (SELECT id FROM categories WHERE slug = 'unmarked-police-vehicles'), 106, 'Car'),
  ('US Unmarked Police', 'us-unmarked-police', 'American unmarked police vehicles', (SELECT id FROM categories WHERE slug = 'unmarked-police-vehicles'), 107, 'Car'),
  ('EU Unmarked Police', 'eu-unmarked-police', 'European unmarked police vehicles', (SELECT id FROM categories WHERE slug = 'unmarked-police-vehicles'), 108, 'Car');

-- Fire Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Fire Vehicles', 'uk-fire-vehicles', 'British fire service vehicles', (SELECT id FROM categories WHERE slug = 'fire-vehicles'), 109, 'Car'),
  ('US Fire Vehicles', 'us-fire-vehicles', 'American fire department vehicles', (SELECT id FROM categories WHERE slug = 'fire-vehicles'), 110, 'Car'),
  ('EU Fire Vehicles', 'eu-fire-vehicles', 'European fire service vehicles', (SELECT id FROM categories WHERE slug = 'fire-vehicles'), 111, 'Car');

-- Ambulance Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Ambulance Vehicles', 'uk-ambulance-vehicles', 'British ambulance and NHS vehicles', (SELECT id FROM categories WHERE slug = 'ambulance-vehicles'), 112, 'Car'),
  ('US Ambulance Vehicles', 'us-ambulance-vehicles', 'American EMS vehicles', (SELECT id FROM categories WHERE slug = 'ambulance-vehicles'), 113, 'Car'),
  ('EU Ambulance Vehicles', 'eu-ambulance-vehicles', 'European emergency medical vehicles', (SELECT id FROM categories WHERE slug = 'ambulance-vehicles'), 114, 'Car');

-- Military Vehicles sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Military Vehicles', 'uk-military-vehicles', 'British armed forces vehicles', (SELECT id FROM categories WHERE slug = 'military-vehicles'), 115, 'Car'),
  ('US Military Vehicles', 'us-military-vehicles', 'American military vehicles', (SELECT id FROM categories WHERE slug = 'military-vehicles'), 116, 'Car'),
  ('EU Military Vehicles', 'eu-military-vehicles', 'European military vehicles', (SELECT id FROM categories WHERE slug = 'military-vehicles'), 117, 'Car');

-- Aircraft sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Aircraft', 'uk-aircraft', 'British aircraft and helicopters', (SELECT id FROM categories WHERE slug = 'aircraft'), 118, 'Plane'),
  ('US Aircraft', 'us-aircraft', 'American aircraft and helicopters', (SELECT id FROM categories WHERE slug = 'aircraft'), 119, 'Plane'),
  ('EU Aircraft', 'eu-aircraft', 'European aircraft and helicopters', (SELECT id FROM categories WHERE slug = 'aircraft'), 120, 'Plane');

-- Uniforms sub-categories
INSERT INTO categories (name, slug, description, parent_id, display_order, icon) VALUES
  ('UK Uniforms', 'uk-uniforms', 'British police, fire, and EMS uniforms', (SELECT id FROM categories WHERE slug = 'uniforms'), 121, 'Shirt'),
  ('US Uniforms', 'us-uniforms', 'American law enforcement and emergency uniforms', (SELECT id FROM categories WHERE slug = 'uniforms'), 122, 'Shirt'),
  ('EU Uniforms', 'eu-uniforms', 'European service uniforms', (SELECT id FROM categories WHERE slug = 'uniforms'), 123, 'Shirt');