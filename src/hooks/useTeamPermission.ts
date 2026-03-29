import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from './useSellerStatus';
import { useAuth } from './useAuth';

export function useTeamPermission(permission: string): boolean {
  const { store } = useSellerStatus();
  const { user } = useAuth();

  const isOwner = store?.owner_id === user?.id;

  const { data: hasPermission = false } = useQuery({
    queryKey: ['team-permission', store?.id, permission, user?.id],
    queryFn: async () => {
      if (!user || !store) return false;
      if (store.owner_id === user.id) return true;

      // Get user's team role
      const { data: teamMember } = await supabase
        .from('store_team_members')
        .select('role')
        .eq('store_id', store.id)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (!teamMember) return false;

      // Check permission for their role
      const { data: perms } = await (supabase as any)
        .from('store_team_permissions')
        .select('id')
        .eq('store_id', store.id)
        .eq('role', teamMember.role)
        .eq('permission', permission)
        .maybeSingle();

      return !!perms;
    },
    enabled: !!store?.id && !!user?.id && !isOwner,
  });

  if (isOwner) return true;
  return hasPermission;
}
