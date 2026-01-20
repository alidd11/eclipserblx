-- Create enum for store team member roles
CREATE TYPE public.store_team_role AS ENUM ('manager', 'editor', 'viewer');

-- Create store_team_members table
CREATE TABLE public.store_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role store_team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

-- Create store_team_invites table for pending invitations
CREATE TABLE public.store_team_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role store_team_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);

-- Enable RLS
ALTER TABLE public.store_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_team_invites ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is store owner
CREATE OR REPLACE FUNCTION public.is_store_owner(store_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = store_uuid AND owner_id = user_uuid
  )
$$;

-- Create function to check if user is store team member with specific role
CREATE OR REPLACE FUNCTION public.is_store_team_member(store_uuid UUID, user_uuid UUID, required_roles store_team_role[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_team_members
    WHERE store_id = store_uuid 
      AND user_id = user_uuid 
      AND accepted_at IS NOT NULL
      AND (required_roles IS NULL OR role = ANY(required_roles))
  )
$$;

-- RLS Policies for store_team_members
-- Store owners can view all team members
CREATE POLICY "Store owners can view team members"
ON public.store_team_members
FOR SELECT
USING (public.is_store_owner(store_id, auth.uid()));

-- Store owners can manage team members
CREATE POLICY "Store owners can insert team members"
ON public.store_team_members
FOR INSERT
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can update team members"
ON public.store_team_members
FOR UPDATE
USING (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can delete team members"
ON public.store_team_members
FOR DELETE
USING (public.is_store_owner(store_id, auth.uid()));

-- Team members can view their own membership
CREATE POLICY "Team members can view own membership"
ON public.store_team_members
FOR SELECT
USING (user_id = auth.uid());

-- RLS Policies for store_team_invites
-- Store owners can manage invites
CREATE POLICY "Store owners can view invites"
ON public.store_team_invites
FOR SELECT
USING (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can create invites"
ON public.store_team_invites
FOR INSERT
WITH CHECK (public.is_store_owner(store_id, auth.uid()));

CREATE POLICY "Store owners can delete invites"
ON public.store_team_invites
FOR DELETE
USING (public.is_store_owner(store_id, auth.uid()));

-- Anyone can view invite by token (for accepting)
CREATE POLICY "Anyone can view invite by token"
ON public.store_team_invites
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_store_team_members_updated_at
BEFORE UPDATE ON public.store_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();