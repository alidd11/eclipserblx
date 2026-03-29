import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from './useSellerStatus';

export function useTeamPermission(permission: string): boolean {
  const { store, isOwner } = useSellerStatus();

  const { data: hasPermission = false } = useQuery({
    queryKey: ['team-permission', store?.id, permission],
    queryFn: async () => {
      if (isOwner) return true;

      // Get user's team role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: teamMember } = await supabase
        .from('store_team_members')
        .select('role')
        .eq('store_id', store!.id)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null)
        .maybeSingle();

      if (!teamMember) return false;

      // Check permission for their role
      const { data: perms } = await supabase
        .from('store_team_permissions')
        .select('id')
        .eq('store_id', store!.id)
        .eq('role', teamMember.role)
        .eq('permission', permission)
        .maybeSingle();

      return !!perms;
    },
    enabled: !!store?.id && !isOwner,
  });

  // Owner always has all permissions
  if (isOwner) return true;

  return hasPermission;
}
