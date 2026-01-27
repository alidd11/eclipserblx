-- Create a unique constraint to prevent same user using same discount code twice
-- We check this via orders table which has user_id and discount_code_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_discount_code_usage 
ON public.orders (user_id, discount_code_id) 
WHERE discount_code_id IS NOT NULL AND status IN ('paid', 'completed');