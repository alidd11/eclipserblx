import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatRoles } from '@/hooks/useChatRoles';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { hapticTap, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import type { ChatMessage, UserProfile, ChatRoomConfig, ChatMember } from './chatHelpers';
import { parseMentions, matchesMention } from './chatHelpers';
import type { ChatReaction } from '@/components/admin/ChatMessageActions';

export function useChatMessages(config: ChatRoomConfig, enabled: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { getBestRole, getRoleBadgeStyle, rolePriority } = useChatRoles();
  const [isUploading, setIsUploading] = useState(false);

  const messagesKey = [config.channelPrefix, 'messages'];
  const reactionsKey = [config.channelPrefix, 'reactions'];
  const profilesKey = [config.channelPrefix, 'profiles'];
  const rolesKey = [config.channelPrefix, 'roles'];

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const { data: messages = [], isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
    enabled,
  });

  // ── Fetch profiles ─────────────────────────────────────────────────────────
  const { data: profiles = {} } = useQuery({
    queryKey: [...profilesKey, messages.map(m => m.user_id)],
    queryFn: async () => {
      if (!messages.length) return {};
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      if (error) throw error;
      return Object.fromEntries(data.map(p => [p.user_id, p])) as Record<string, UserProfile>;
    },
    enabled: messages.length > 0 && enabled,
  });

  // ── Fetch roles ────────────────────────────────────────────────────────────
  const { data: userRoles = {} } = useQuery({
    queryKey: [...rolesKey, messages.map(m => m.user_id), rolePriority],
    queryFn: async () => {
      if (!messages.length) return {};
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      if (error) throw error;
      const roleMap: Record<string, string> = {};
      for (const userId of userIds) {
        const roles = data.filter(r => r.user_id === userId).map(r => r.role);
        const bestRole = getBestRole(roles);
        if (bestRole) roleMap[userId] = bestRole;
      }
      return roleMap;
    },
    enabled: messages.length > 0 && enabled,
  });

  // ── Fetch current user profile ─────────────────────────────────────────────
  const { data: currentUserProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data as UserProfile;
    },
    enabled: !!user?.id,
  });

  // ── Fetch reactions ────────────────────────────────────────────────────────
  const { data: reactions = [] } = useQuery({
    queryKey: [...reactionsKey, messages.map(m => m.id)],
    queryFn: async () => {
      if (!messages.length) return [];
      const messageIds = messages.map(m => m.id);
      const { data, error } = await supabase
        .from(config.reactionsTable as any)
        .select('*')
        .in('message_id', messageIds);
      if (error) throw error;
      return (data || []) as unknown as ChatReaction[];
    },
    enabled: messages.length > 0 && enabled,
  });

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`${config.channelPrefix}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: config.table }, (payload) => {
        queryClient.invalidateQueries({ queryKey: messagesKey });
        if (document.hidden && payload.eventType === 'INSERT' && payload.new?.user_id !== user?.id) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New ${config.headerTitle} Message`, {
              body: (payload.new as any)?.message?.substring(0, 100) || 'New message',
              tag: `${config.channelPrefix}-${payload.new?.id}`,
              icon: '/favicon.ico',
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: config.reactionsTable }, () => {
        queryClient.invalidateQueries({ queryKey: reactionsKey });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, config.channelPrefix, config.table, config.reactionsTable, user?.id]);

  // ── Upload file ────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    toast.info('Scanning file...', { id: `${config.channelPrefix}-scan` });
    const scanResult = await performSecurityScan(file);
    if (!scanResult.isAllowed) {
      toast.dismiss(`${config.channelPrefix}-scan`);
      toast.error(scanResult.reason || 'File blocked by security scan');
      return null;
    }
    toast.dismiss(`${config.channelPrefix}-scan`);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from(config.storageBucket)
      .upload(fileName, file);
    if (uploadError) throw uploadError;
    return fileName;
  }, [user?.id, config.storageBucket, config.channelPrefix]);

  // ── Send mention notifications ─────────────────────────────────────────────
  const sendMentionNotifications = useCallback(async (
    message: string,
    senderId: string,
    allMembers: ChatMember[],
  ) => {
    const mentions = parseMentions(message);
    if (mentions.length === 0) return;

    const senderName = currentUserProfile?.display_name || currentUserProfile?.email?.split('@')[0] || 'Someone';
    const hasEveryone = mentions.includes('everyone');
    const hasHere = mentions.includes('here');

    let targetUserIds: string[];
    if (hasEveryone || hasHere) {
      targetUserIds = allMembers.filter(m => m.user_id !== senderId).map(m => m.user_id);
    } else {
      targetUserIds = allMembers
        .filter(m => m.user_id !== senderId && mentions.some(mention => matchesMention(m, mention)))
        .map(m => m.user_id);
    }

    if (targetUserIds.length === 0) return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: targetUserIds,
          payload: {
            title: `${senderName} ${config.notificationTitle}`,
            body: message.length > 100 ? message.substring(0, 100) + '...' : message,
            tag: `${config.channelPrefix}-mention-${Date.now()}`,
            url: config.notificationUrl,
            requireInteraction: true,
          },
        },
      });
    } catch (err) {
      console.error('Failed to send mention notifications:', err);
    }
  }, [currentUserProfile, config]);

  // ── Send message mutation ──────────────────────────────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachmentUrl, replyToId }: { message: string; attachmentUrl: string | null; replyToId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(config.table as any)
        .insert({
          user_id: user.id,
          message: message.trim() || (attachmentUrl ? '📎 Attachment' : ''),
          attachment_url: attachmentUrl,
          reply_to_id: replyToId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      hapticTap();
      queryClient.invalidateQueries({ queryKey: messagesKey });
    },
    onError: (error: Error) => {
      hapticError();
      toast.error('Failed to send message', { description: error?.message || 'Please try again' });
    },
  });

  // ── Delete message mutation ────────────────────────────────────────────────
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from(config.table as any)
        .delete()
        .eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      hapticTap();
      queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });

  // ── Reaction mutations ─────────────────────────────────────────────────────
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from(config.reactionsTable as any)
        .insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reactionsKey }),
  });

  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      const { error } = await supabase
        .from(config.reactionsTable as any)
        .delete()
        .eq('id', reactionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reactionsKey }),
  });

  return {
    messages,
    isLoading,
    profiles,
    userRoles,
    currentUserProfile,
    reactions,
    sendMessageMutation,
    deleteMessageMutation,
    addReactionMutation,
    removeReactionMutation,
    uploadFile,
    sendMentionNotifications,
    isUploading,
    setIsUploading,
    getRoleBadgeStyle,
  };
}
