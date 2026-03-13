import { AdminLayout } from '@/components/admin/AdminLayout';
import { StaffChatRoom } from '@/components/chat/StaffChatRoom';
import { supabase } from '@/integrations/supabase/client';
import { STAFF_GROUP_MENTIONS } from '@/components/chat/chatHelpers';
import type { ChatRoomConfig, ChatMember } from '@/components/chat/chatHelpers';

const STAFF_CHAT_CONFIG: ChatRoomConfig = {
  table: 'staff_chat_messages',
  reactionsTable: 'staff_chat_reactions',
  storageBucket: 'staff-chat-attachments',
  channelPrefix: 'staff-chat',
  headerTitle: 'Staff Messages',
  readChannel: 'staff',
  notificationUrl: '/admin/staff-messages',
  notificationTitle: 'mentioned you',
  groupMentions: STAFF_GROUP_MENTIONS,
  fallbackDisplayName: 'Staff',
};

async function fetchStaffMembers(): Promise<ChatMember[]> {
  const { data, error } = await supabase.rpc('list_staff_members');
  if (error) throw error;
  return (data ?? []) as ChatMember[];
}

export default function StaffMessages() {
  return (
    <AdminLayout>
      <StaffChatRoom
        config={STAFF_CHAT_CONFIG}
        fetchMembers={fetchStaffMembers}
        membersQueryKey={['all-staff-members']}
      />
    </AdminLayout>
  );
}
