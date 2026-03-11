
-- Add sequential product number column
ALTER TABLE products ADD COLUMN product_number BIGINT;

-- Create sequence and backfill existing products
CREATE SEQUENCE IF NOT EXISTS products_product_number_seq;
UPDATE products SET product_number = nextval('products_product_number_seq')
  WHERE product_number IS NULL;

-- Make it non-nullable with auto-default going forward
ALTER TABLE products
  ALTER COLUMN product_number SET NOT NULL,
  ALTER COLUMN product_number SET DEFAULT nextval('products_product_number_seq');

-- Unique index for lookups
CREATE UNIQUE INDEX idx_products_product_number ON products(product_number);
