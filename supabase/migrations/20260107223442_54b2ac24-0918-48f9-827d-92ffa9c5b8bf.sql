-- Create a function to check if an auth user exists
CREATE OR REPLACE FUNCTION public.auth_user_exists(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = _user_id
  )
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auth_user_exists(uuid) TO authenticated;

-- Also add a policy to allow admins to delete orphaned profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));