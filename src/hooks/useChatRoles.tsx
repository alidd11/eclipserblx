import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleBadgeInfo {
  label: string;
  className: string;
}

/**
 * Fetches all custom_roles and builds dynamic role badge styling + priority ordering.
 * Replaces hardcoded DEFAULT_ROLE_BADGES and ROLE_PRIORITY in chat components.
 */
export function useChatRoles() {
  const { data: customRoles = [] } = useQuery({
    queryKey: ['chat-custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('name, display_name, color, hierarchy_level, is_status_role')
        .order('hierarchy_level', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // cache 10 min
  });

  // Build role priority list sorted by hierarchy (highest first), excluding status roles
  const rolePriority: string[] = customRoles
    .filter(r => !r.is_status_role)
    .map(r => r.name);

  // Build badge map from custom_roles data
  const roleBadges: Record<string, RoleBadgeInfo> = {};
  for (const role of customRoles) {
    const color = role.color || '#6b7280';
    roleBadges[role.name] = {
      label: role.display_name,
      className: `border-[${color}]/30 text-[${color}]`,
    };
  }

  /** Given a user's role list, return the highest-priority staff role name */
  const getBestRole = (roles: string[]): string | undefined => {
    return rolePriority.find(r => roles.includes(r));
  };

  /** Get badge info for a role name, with inline style for dynamic colors */
  const getRoleBadgeStyle = (roleName: string): { label: string; style: React.CSSProperties } | null => {
    const role = customRoles.find(r => r.name === roleName);
    if (!role) return null;
    const color = role.color || '#6b7280';
    return {
      label: role.display_name,
      style: {
        borderColor: `${color}40`,
        color: color,
        backgroundColor: `${color}18`,
      },
    };
  };

  return {
    rolePriority,
    roleBadges,
    getBestRole,
    getRoleBadgeStyle,
    customRoles,
  };
}
