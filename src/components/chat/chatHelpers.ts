import type { ReactNode } from 'react';
import { createElement } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
  reply_to_id: string | null;
}

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

export interface ChatMember {
  user_id: string;
  display_name: string | null;
  email?: string;
  role?: string;
  last_seen?: string;
  roles?: string[];
}

export interface TypingUser {
  user_id: string;
  name: string;
}

export interface ChatRoomConfig {
  /** DB table for messages */
  table: 'staff_chat_messages' | 'admin_chat_messages';
  /** DB table for reactions */
  reactionsTable: 'staff_chat_reactions' | 'admin_chat_reactions';
  /** Storage bucket name */
  storageBucket: 'staff-chat-attachments' | 'admin-chat-attachments';
  /** Supabase realtime channel prefix */
  channelPrefix: string;
  /** Header title */
  headerTitle: string;
  /** markChatAsRead key */
  readChannel: 'staff' | 'admin';
  /** Push notification url */
  notificationUrl: string;
  /** Push notification title prefix */
  notificationTitle: string;
  /** Group mentions available */
  groupMentions: GroupMention[];
  /** Default display name for unknown users */
  fallbackDisplayName: string;
  /** Whether everyone in the chat can delete all messages */
  canDeleteAll?: boolean;
}

export interface GroupMention {
  id: string;
  name: string;
  description: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const STAFF_GROUP_MENTIONS: GroupMention[] = [
  { id: 'everyone', name: 'everyone', description: 'Notify all staff members' },
  { id: 'here', name: 'here', description: 'Notify all online staff' },
];

export const ADMIN_GROUP_MENTIONS: GroupMention[] = [
  { id: 'everyone', name: 'everyone', description: 'Notify all admins' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

export const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
};

export const getFileName = (url: string): string => {
  try {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  } catch {
    return 'attachment';
  }
};

export const parseMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
};

export const getMentionHandle = (member: ChatMember): string => {
  const email = member.email || '';
  const base = (member.display_name || email.split('@')[0] || 'user').toLowerCase();
  return base.replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'user';
};

export const matchesMention = (member: ChatMember, mentionHandle: string): boolean => {
  const normalizedMention = mentionHandle.toLowerCase().replace(/_/g, '');
  const handle = getMentionHandle(member).replace(/_/g, '');
  const displayName = (member.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const emailPrefix = (member.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    handle === normalizedMention ||
    displayName === normalizedMention ||
    emailPrefix === normalizedMention ||
    handle.includes(normalizedMention) ||
    displayName.includes(normalizedMention)
  );
};

export const renderMessageWithMentions = (message: string, opts?: { isOwn?: boolean }): ReactNode[] => {
  const isOwn = !!opts?.isOwn;
  const parts = message.split(/(@[a-zA-Z0-9_]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      const mentionClass = isOwn
        ? 'text-primary-foreground font-medium bg-primary-foreground/15 rounded px-1'
        : 'text-primary font-medium bg-primary/10 rounded px-1';

      return createElement('span', { key: index, className: mentionClass }, part);
    }
    return part;
  });
};
