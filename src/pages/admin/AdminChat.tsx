import { AdminLayout } from '@/components/admin/AdminLayout';
import { StaffChatRoom } from '@/components/chat/StaffChatRoom';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_GROUP_MENTIONS } from '@/components/chat/chatHelpers';
import type { ChatRoomConfig, ChatMember } from '@/components/chat/chatHelpers';

const ADMIN_CHAT_CONFIG: ChatRoomConfig = {
  table: 'admin_chat_messages',
  reactionsTable: 'admin_chat_reactions',
  storageBucket: 'admin-chat-attachments',
  channelPrefix: 'admin-chat',
  headerTitle: 'Admin Chat',
  readChannel: 'admin',
  notificationUrl: '/admin/admin-chat',
  notificationTitle: 'mentioned you in Admin Chat',
  groupMentions: ADMIN_GROUP_MENTIONS,
  fallbackDisplayName: 'Admin',
  canDeleteAll: true,
};

async function fetchAdminMembers(): Promise<ChatMember[]> {
  // Get all users who have admin role
  const { data: adminRoles, error: adminRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (adminRolesError) throw adminRolesError;

  // Get users who have view_admin_chat permission through role_permissions
  const { data: permissionData, error: permError } = await supabase
    .from('permissions')
    .select('id')
    .eq('name', 'view_admin_chat')
    .single();

  let usersWithPermission: string[] = [];
  if (!permError && permissionData) {
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('role')
      .eq('permission_id', permissionData.id);

    if (rolePerms?.length) {
      const roles = rolePerms.map(rp => rp.role);
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', roles);

      if (userRolesData) {
        usersWithPermission = userRolesData.map(ur => ur.user_id);
      }
    }
  }

  const adminUserIds = adminRoles?.map(r => r.user_id) || [];
  const allUserIds = [...new Set([...adminUserIds, ...usersWithPermission])];

  if (!allUserIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, display_name, email')
    .in('user_id', allUserIds);

  if (profilesError) throw profilesError;
  return (profiles || []) as ChatMember[];
}

export default function AdminChat() {
  return (
    <AdminLayout requiredPermissions={['view_admin_chat']}>
      <StaffChatRoom
        config={ADMIN_CHAT_CONFIG}
        fetchMembers={fetchAdminMembers}
        membersQueryKey={['admin-chat-members']}
      />
    </AdminLayout>
  );
}
