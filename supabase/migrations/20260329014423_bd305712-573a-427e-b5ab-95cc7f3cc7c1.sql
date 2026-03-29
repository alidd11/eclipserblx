
CREATE TABLE public.guild_command_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  command_name text NOT NULL,
  allowed_role_ids text[] NOT NULL DEFAULT '{}',
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, command_name)
);

ALTER TABLE public.guild_command_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage own guild permissions"
ON public.guild_command_permissions
FOR ALL
TO authenticated
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Admins full access to guild_command_permissions"
ON public.guild_command_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
