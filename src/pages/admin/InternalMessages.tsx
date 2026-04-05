import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StaffChatRoom } from '@/components/chat/StaffChatRoom';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_GROUP_MENTIONS, STAFF_GROUP_MENTIONS } from '@/components/chat/chatHelpers';
import type { ChatRoomConfig, ChatMember } from '@/components/chat/chatHelpers';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { Hash, Lock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Channel configs ────────────────────────────────────────────────────────────

type ChannelId = 'staff' | 'admin';

interface ChannelDef {
  id: ChannelId;
  label: string;
  description: string;
  icon: typeof Hash;
  config: ChatRoomConfig;
  fetchMembers: () => Promise<ChatMember[]>;
  membersQueryKey: string[];
  permission?: string;
}

const STAFF_CONFIG: ChatRoomConfig = {
  table: 'staff_chat_messages',
  reactionsTable: 'staff_chat_reactions',
  storageBucket: 'staff-chat-attachments',
  channelPrefix: 'staff-chat',
  headerTitle: 'Staff General',
  readChannel: 'staff',
  notificationUrl: '/admin/messages?channel=staff',
  notificationTitle: 'mentioned you',
  groupMentions: STAFF_GROUP_MENTIONS,
  fallbackDisplayName: 'Staff',
};

const ADMIN_CONFIG: ChatRoomConfig = {
  table: 'admin_chat_messages',
  reactionsTable: 'admin_chat_reactions',
  storageBucket: 'admin-chat-attachments',
  channelPrefix: 'admin-chat',
  headerTitle: 'Admin Only',
  readChannel: 'admin',
  notificationUrl: '/admin/messages?channel=admin',
  notificationTitle: 'mentioned you in Admin Chat',
  groupMentions: ADMIN_GROUP_MENTIONS,
  fallbackDisplayName: 'Admin',
  canDeleteAll: true,
};

async function fetchStaffMembers(): Promise<ChatMember[]> {
  const { data, error } = await supabase.rpc('list_staff_members');
  if (error) throw error;
  return (data ?? []) as ChatMember[];
}

async function fetchAdminMembers(): Promise<ChatMember[]> {
  const { data: adminRoles, error: adminRolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  if (adminRolesError) throw adminRolesError;

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function InternalMessages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAdminAuth();
  const { hasAnyPermission } = useUserPermissions({ enabled: !isAdmin });
  const chatNotifications = useChatNotifications();

  const canViewAdmin = isAdmin || hasAnyPermission(['view_admin_chat']);

  const channels: ChannelDef[] = useMemo(() => {
    const list: ChannelDef[] = [
      {
        id: 'staff',
        label: 'Staff General',
        description: 'All staff members',
        icon: Hash,
        config: STAFF_CONFIG,
        fetchMembers: fetchStaffMembers,
        membersQueryKey: ['all-staff-members'],
      },
    ];

    if (canViewAdmin) {
      list.push({
        id: 'admin',
        label: 'Admin Only',
        description: 'Admins & permitted roles',
        icon: Lock,
        config: ADMIN_CONFIG,
        fetchMembers: fetchAdminMembers,
        membersQueryKey: ['admin-chat-members'],
        permission: 'view_admin_chat',
      });
    }

    return list;
  }, [canViewAdmin]);

  const paramChannel = searchParams.get('channel') as ChannelId | null;
  const [activeChannel, setActiveChannel] = useState<ChannelId>(
    paramChannel && channels.some(c => c.id === paramChannel) ? paramChannel : 'staff'
  );

  const switchChannel = useCallback((id: ChannelId) => {
    setActiveChannel(id);
    setSearchParams({ channel: id }, { replace: true });
  }, [setSearchParams]);

  const active = channels.find(c => c.id === activeChannel) || channels[0];

  const getUnreadForChannel = (id: ChannelId) => {
    if (id === 'staff') {
      return {
        mention: chatNotifications.staffMessagesMention,
        unread: chatNotifications.staffMessagesUnread,
      };
    }
    return {
      mention: chatNotifications.adminChatMention,
      unread: chatNotifications.adminChatUnread,
    };
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* ── Desktop channel sidebar ── */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-muted/30">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Messages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Internal channels</p>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {channels.map((ch) => {
              const isActive = ch.id === activeChannel;
              const { mention, unread } = getUnreadForChannel(ch.id);

              return (
                <button
                  key={ch.id}
                  onClick={() => switchChannel(ch.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <ch.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{ch.label}</span>
                  {mention && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] font-bold">
                      @
                    </Badge>
                  )}
                  {!mention && unread && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Mobile channel selector ── */}
        <div className="md:hidden shrink-0 border-b border-border bg-card px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm font-medium w-full px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <active.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{active.label}</span>
              {(() => {
                const { mention, unread } = getUnreadForChannel(activeChannel);
                if (mention) return <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] font-bold">@</Badge>;
                if (unread) return <span className="h-2 w-2 rounded-full bg-primary shrink-0" />;
                return null;
              })()}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {channels.map((ch) => {
                const { mention, unread } = getUnreadForChannel(ch.id);
                return (
                  <DropdownMenuItem
                    key={ch.id}
                    onClick={() => switchChannel(ch.id)}
                    className={cn(
                      'flex items-center gap-2',
                      ch.id === activeChannel && 'bg-primary/10 text-primary'
                    )}
                  >
                    <ch.icon className="h-4 w-4" />
                    <span className="flex-1">{ch.label}</span>
                    {mention && <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">@</Badge>}
                    {!mention && unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <StaffChatRoom
            key={active.id}
            config={active.config}
            fetchMembers={active.fetchMembers}
            membersQueryKey={active.membersQueryKey}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
