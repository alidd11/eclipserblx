-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

-- Create a more restrictive policy that still allows public submissions
-- but validates that the required fields are being set properly
CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages 
FOR INSERT 
TO public
WITH CHECK (
  -- Ensure name, email, subject, and message are provided (non-empty)
  name IS NOT NULL AND name <> '' AND
  email IS NOT NULL AND email <> '' AND
  subject IS NOT NULL AND subject <> '' AND
  message IS NOT NULL AND message <> '' AND
  -- Ensure status defaults are respected (can't insert as 'resolved')
  (status IS NULL OR status = 'new') AND
  -- Prevent setting staff-only fields
  responded_at IS NULL AND
  responded_by IS NULL AND
  notes IS NULL
);