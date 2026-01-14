-- Insert the new "Eclipse Savers" category
-- This category's products will NOT receive Eclipse+ discounts

INSERT INTO public.categories (name, slug, description, display_order, icon)
VALUES (
  'Eclipse Savers',
  'eclipse-savers',
  'Budget-friendly products at fixed low prices - Eclipse+ discounts do not apply',
  99,
  'Percent'
);