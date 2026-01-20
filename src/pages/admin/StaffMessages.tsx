import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Users, AtSign, X } from 'lucide-react';
import { ChatMessageActions, ChatReaction } from '@/components/admin/ChatMessageActions';
import { QuotedMessage } from '@/components/admin/QuotedMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { KeyboardDebugOverlay } from '@/components/admin/KeyboardDebugOverlay';
import { ChatQuickActions } from '@/components/admin/ChatQuickActions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useIOSKeyboardFix } from '@/hooks/useIOSKeyboardFix';
import { markChatAsRead } from '@/hooks/useChatNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { hapticTap, hapticError } from '@/lib/haptics';

type AppRole = Database['public']['Enums']['app_role'];

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to_id: string | null;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

interface StaffMember {
  user_id: string;
  display_name: string | null;
  email: string;
  role?: AppRole;
}

interface TypingUser {
  user_id: string;
  name: string;
}

const roleBadges: Record<AppRole, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  product_manager: { label: 'Products', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  order_manager: { label: 'Orders', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  support_agent: { label: 'Support', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  analyst: { label: 'Analyst', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  recruiter: { label: 'Recruiter', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  seller: { label: 'Seller', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

// Parse @mentions from message text
const parseMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
};

// Get mention handle from staff member
const getMentionHandle = (staff: StaffMember): string => {
  const base = (staff.display_name || staff.email.split('@')[0] || 'staff').toLowerCase();
  return base.replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'staff';
};

// Check if a mention matches a staff member
const matchesMention = (staff: StaffMember, mentionHandle: string): boolean => {
  const normalizedMention = mentionHandle.toLowerCase().replace(/_/g, '');
  const handle = getMentionHandle(staff).replace(/_/g, '');
  const displayName = (staff.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const emailPrefix = staff.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return handle === normalizedMention || 
         displayName === normalizedMention || 
         emailPrefix === normalizedMention ||
         handle.includes(normalizedMention) ||
         displayName.includes(normalizedMention);
};

// Render message with highlighted mentions
const renderMessageWithMentions = (message: string, opts?: { isOwn?: boolean }) => {
  const isOwn = !!opts?.isOwn;
  const parts = message.split(/(@[a-zA-Z0-9_]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      // If the message bubble is already primary-colored, use primary-foreground for contrast.
      const mentionClass = isOwn
        ? 'text-primary-foreground font-medium bg-primary-foreground/15 rounded px-1'
        : 'text-primary font-medium bg-primary/10 rounded px-1';

      return (
        <span key={index} className={mentionClass}>
          {part}
        </span>
      );
    }

    return part;
  });
};

// Group mention options
const GROUP_MENTIONS = [
  { id: 'everyone', name: 'everyone', description: 'Notify all staff members' },
  { id: 'here', name: 'here', description: 'Notify all online staff' },
];

function StaffMessagesContent() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // iOS keyboard fix for PWA - now only provides visibility state for scroll behavior
  const { isKeyboardVisible } = useIOSKeyboardFix();

  // Mark messages as read when component mounts
  useEffect(() => {
    if (user) {
      markChatAsRead('staff', user.id);
    }
  }, [user]);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['staff-chat-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  // Fetch user profiles
  const { data: profiles = {} } = useQuery({
    queryKey: ['staff-profiles', messages.map(m => m.user_id)],
    queryFn: async () => {
      if (!messages.length) return {};
      const userIds = [...new Set(messages.map(m => m.user_id))];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      return Object.fromEntries(
        data.map(p => [p.user_id, p])
      ) as Record<string, UserProfile>;
    },
    enabled: messages.length > 0,
  });

  // Fetch user roles
  const { data: userRoles = {} } = useQuery({
    queryKey: ['staff-roles', messages.map(m => m.user_id)],
    queryFn: async () => {
      if (!messages.length) return {};
      const userIds = [...new Set(messages.map(m => m.user_id))];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      return Object.fromEntries(
        data.map(r => [r.user_id, r.role])
      ) as Record<string, AppRole>;
    },
    enabled: messages.length > 0,
  });

  // Fetch current user profile for presence
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

  // Fetch all staff members for @mentions
  const {
    data: allStaff = [],
    isLoading: isStaffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ['all-staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-staff');
      if (error) throw error;
      return (data?.staff ?? []) as StaffMember[];
    },
  });

  // Filtered staff for mentions
  const filteredGroupMentions = GROUP_MENTIONS.filter(g => 
    g.name.includes(mentionFilter.toLowerCase())
  );
  
  const filteredStaff = allStaff.filter(staff => {
    if (staff.user_id === user?.id) return false;
    const display = (staff.display_name || staff.email.split('@')[0]).toLowerCase();
    const handle = getMentionHandle(staff);
    const q = mentionFilter.toLowerCase();
    return display.includes(q) || handle.includes(q);
  });

  // Combined suggestions
  const allSuggestions = [
    ...filteredGroupMentions.map(g => ({ type: 'group' as const, ...g })),
    ...filteredStaff.map(s => ({ type: 'staff' as const, ...s })),
  ];

  // Send push notification to mentioned users
  const sendMentionNotifications = async (message: string, senderId: string) => {
    const mentions = parseMentions(message);
    if (mentions.length === 0) return;

    const senderProfile = currentUserProfile;
    const senderName = senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Someone';

    // Check for group mentions
    const hasEveryone = mentions.includes('everyone');
    const hasHere = mentions.includes('here');

    let targetUserIds: string[] = [];

    if (hasEveryone || hasHere) {
      // Notify all staff except sender
      targetUserIds = allStaff
        .filter(s => s.user_id !== senderId)
        .map(s => s.user_id);
    } else {
      // Find specific mentioned users
      targetUserIds = allStaff
        .filter(staff => {
          if (staff.user_id === senderId) return false;
          return mentions.some(mention => matchesMention(staff, mention));
        })
        .map(s => s.user_id);
    }

    if (targetUserIds.length === 0) return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: targetUserIds,
          payload: {
            title: `${senderName} mentioned you`,
            body: message.length > 100 ? message.substring(0, 100) + '...' : message,
            tag: `staff-mention-${Date.now()}`,
            url: '/admin/staff-messages',
            requireInteraction: true,
          },
        },
      });
      console.log('Mention notifications sent to', targetUserIds.length, 'users');
    } catch (err) {
      console.error('Failed to send mention notifications:', err);
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, replyToId }: { message: string; replyToId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('staff_chat_messages')
        .insert({
          user_id: user.id,
          message: message.trim(),
          reply_to_id: replyToId,
        });
      
      if (error) throw error;

      // Send notifications to mentioned users
      await sendMentionNotifications(message.trim(), user.id);
    },
    onSuccess: () => {
      hapticTap();
      setNewMessage('');
      setReplyToMessage(null);
      setShowMentionSuggestions(false);
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
    },
    onError: () => {
      hapticError();
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('staff_chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      hapticTap();
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
    },
  });

  // Fetch reactions for all messages
  const { data: reactions = [] } = useQuery({
    queryKey: ['staff-chat-reactions', messages.map(m => m.id)],
    queryFn: async () => {
      if (!messages.length) return [];
      const messageIds = messages.map(m => m.id);
      
      const { data, error } = await supabase
        .from('staff_chat_reactions')
        .select('*')
        .in('message_id', messageIds);
      
      if (error) throw error;
      return (data || []) as ChatReaction[];
    },
    enabled: messages.length > 0,
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('staff_chat_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat-reactions'] });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      const { error } = await supabase
        .from('staff_chat_reactions')
        .delete()
        .eq('id', reactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat-reactions'] });
    },
  });

  // Scroll to bottom (native scroll)
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages and initial load
  useEffect(() => {
    // Immediate scroll
    scrollToBottom();
    // Delayed scroll to ensure DOM has rendered (especially on initial load)
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Keep the newest messages visible when the iOS keyboard opens/closes (PWA)
  // Only respond to significant viewport changes (keyboard open/close), not scroll events
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;
    let raf = 0;

    const handleViewportResize = () => {
      // Only scroll if viewport height changed significantly (keyboard open/close)
      const heightDelta = Math.abs(vv.height - lastHeight);
      if (heightDelta > 50) {
        lastHeight = vv.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          // Reset any document scroll iOS might have caused
          window.scrollTo(0, 0);
          scrollToBottom();
        });
      }
    };

    vv.addEventListener('resize', handleViewportResize);
    // Removed scroll listener - it causes conflicts with iOS auto-scroll

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', handleViewportResize);
    };
  }, [scrollToBottom]);

  // Extra reliability: when keyboard state changes, force scroll to latest with aggressive scroll lock
  useEffect(() => {
    if (!isKeyboardVisible) return;

    // Aggressively reset document scroll during keyboard animation to prevent iOS auto-scroll
    const lockScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Lock scroll position during keyboard opening animation
    lockScroll();
    const lockInterval = setInterval(lockScroll, 16);

    // Stop after keyboard animation completes (~350ms) and scroll to bottom
    const cleanup = setTimeout(() => {
      clearInterval(lockInterval);
      scrollToBottom();
    }, 350);

    return () => {
      clearInterval(lockInterval);
      window.clearTimeout(cleanup);
    };
  }, [isKeyboardVisible, scrollToBottom]);

  // Real-time subscription for messages and reactions
  useEffect(() => {
    const channel = supabase
      .channel('staff-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_chat_reactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-chat-reactions'] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Presence for typing indicators
  useEffect(() => {
    if (!user?.id || !currentUserProfile) return;

    const presenceChannel = supabase.channel('staff-chat-presence');
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.typing && presence.user_id !== user.id) {
              typing.push({
                user_id: presence.user_id,
                name: presence.name,
              });
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            name: currentUserProfile.display_name || currentUserProfile.email.split('@')[0],
            typing: false,
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id, currentUserProfile]);


  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!user?.id || !currentUserProfile || !presenceChannelRef.current) return;

    presenceChannelRef.current.track({
      user_id: user.id,
      name: currentUserProfile.display_name || currentUserProfile.email.split('@')[0],
      typing: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: user.id,
          name: currentUserProfile.display_name || currentUserProfile.email.split('@')[0],
          typing: false,
        });
      }
    }, 2000);
  }, [user?.id, currentUserProfile]);

  // Handle input change with mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    handleTyping();

    // Check for @ mention trigger
    // Safari/iOS PWA can report selectionStart as 0 during onChange; treat that as "end" for chat.
    const rawCursorPos = e.target.selectionStart;
    const cursorPos =
      rawCursorPos == null
        ? value.length
        : rawCursorPos === 0 && value.length > 0
          ? value.length
          : rawCursorPos;

    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (mentionMatch) {
      setShowMentionSuggestions(true);
      setMentionFilter(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setMentionFilter('');
    }
  }, [handleTyping]);

  // Insert mention into message
  const insertMention = (name: string) => {
    const rawCursorPos = inputRef.current?.selectionStart;
    const cursorPos =
      rawCursorPos == null
        ? newMessage.length
        : rawCursorPos === 0 && newMessage.length > 0
          ? newMessage.length
          : rawCursorPos;

    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const textAfterCursor = newMessage.slice(cursorPos);

    // Find the @ position
    const atPos = textBeforeCursor.lastIndexOf('@');
    
    let newText: string;
    if (atPos === -1) {
      // Quick action: no @ in text, just append the mention
      const prefix = newMessage.length > 0 && !newMessage.endsWith(' ') ? ' ' : '';
      newText = newMessage + prefix + `@${name} `;
    } else {
      // Autocomplete: replace from @ position
      newText = textBeforeCursor.slice(0, atPos) + `@${name} ` + textAfterCursor;
    }
    
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    setMentionFilter('');

    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ message: newMessage, replyToId: replyToMessage?.id || null });
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage(message);
      inputRef.current?.focus();
    }
  };

  // Create a map of messages for easy lookup
  const messagesMap = useMemo(() => {
    return Object.fromEntries(messages.map(m => [m.id, m]));
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionSuggestions && allSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % allSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + allSuggestions.length) % allSuggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = allSuggestions[mentionIndex];
        if (selected) {
          const name = selected.type === 'group' ? selected.name : getMentionHandle(selected);
          insertMention(name);
        }
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getDisplayName = (userId: string) => {
    const profile = profiles[userId];
    return profile?.display_name || profile?.email?.split('@')[0] || 'Staff';
  };

  const getInitials = (userId: string) => {
    const name = getDisplayName(userId);
    return name.slice(0, 2).toUpperCase();
  };

  const canDeleteMessage = (messageUserId: string) => {
    return isAdmin || messageUserId === user?.id;
  };

  return (
      <div 
        className="h-full flex flex-col overflow-hidden overflow-x-hidden px-0 sm:px-4 pb-0 bg-card overscroll-contain"
        style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}
      >
      <KeyboardDebugOverlay />
      {/* Header */}
      <div className="flex items-center justify-between py-2 sm:py-4 px-3 sm:px-0 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Staff Messages</h1>
          <p className="text-xs sm:text-base text-muted-foreground">Real-time communication with your team • Use @mentions to notify</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">Team Chat</span>
        </div>
      </div>

      {/* Chat Card - fills remaining space, flush edge-to-edge on mobile */}
      <Card className="bg-card sm:bg-card/50 sm:backdrop-blur border-border/50 flex-1 flex flex-col min-h-0 overflow-hidden rounded-none sm:rounded-lg border-x-0 sm:border-x border-b-0 sm:border-b sm:mb-4">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 flex-shrink-0">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Staff Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden overscroll-none">
          {/* Messages area - fills available space with native scroll */}
        <div 
          ref={scrollRef} 
          className="flex-1 px-3 sm:px-4 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
            <div className="py-4 flex flex-col">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
              messages.map((message, index) => {
                  const isOwn = message.user_id === user?.id;
                  const role = userRoles[message.user_id];
                  const roleBadge = role ? roleBadges[role] : null;
                  
                  // Check if this message should be grouped with the previous one
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const isGrouped = prevMessage && 
                    prevMessage.user_id === message.user_id &&
                    (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) <= 30000;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2 sm:gap-3 group',
                        isOwn && 'flex-row-reverse',
                        isGrouped ? 'mt-1' : index > 0 ? 'mt-3' : ''
                      )}
                    >
                      {/* Avatar - invisible spacer when grouped */}
                      {isGrouped ? (
                        <div className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0" />
                      ) : (
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {getInitials(message.user_id)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn('flex flex-col max-w-[75%] sm:max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
                        {/* Header - only show for first message in group */}
                        {!isGrouped && (
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-medium text-foreground">
                              {getDisplayName(message.user_id)}
                            </span>
                            {roleBadge && (
                              <Badge variant="outline" className={cn('text-[10px] sm:text-xs py-0', roleBadge.className)}>
                                {roleBadge.label}
                              </Badge>
                            )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                        {/* Quoted message if replying */}
                        {message.reply_to_id && messagesMap[message.reply_to_id] && (
                          <QuotedMessage
                            message={messagesMap[message.reply_to_id].message}
                            senderName={getDisplayName(messagesMap[message.reply_to_id].user_id)}
                            isCompact
                            className="mb-1 max-w-full"
                          />
                        )}
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm break-words',
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          {renderMessageWithMentions(message.message, { isOwn })}
                        </div>
                        <ChatMessageActions
                          messageId={message.id}
                          isOwn={isOwn}
                          canDelete={canDeleteMessage(message.user_id)}
                          reactions={reactions.filter(r => r.message_id === message.id)}
                          currentUserId={user?.id || ''}
                          onAddReaction={(msgId, emoji) => addReactionMutation.mutate({ messageId: msgId, emoji })}
                          onRemoveReaction={(reactionId) => removeReactionMutation.mutate(reactionId)}
                          onDelete={(msgId) => deleteMessageMutation.mutate(msgId)}
                          onReply={handleReply}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-3 sm:px-4 py-2 text-sm text-muted-foreground flex-shrink-0">
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Reply preview */}
          {replyToMessage && (
            <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0">
              <QuotedMessage
                message={replyToMessage.message}
                senderName={getDisplayName(replyToMessage.user_id)}
                onClear={() => setReplyToMessage(null)}
              />
            </div>
          )}

          {/* Message input with mention suggestions - stays in flex flow */}
          <div 
            ref={inputBarRef}
            className="px-3 py-2 sm:px-4 sm:py-3 border-t border-border/50 relative flex-shrink-0 bg-card sm:bg-card/95 sm:backdrop-blur-sm"
          >
            {/* Mention suggestions dropdown */}
            {showMentionSuggestions && (
              <div className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 mb-2 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-[100]">
                {isStaffLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading team…</div>
                ) : staffError ? (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
                    onClick={() => refetchStaff()}
                  >
                    Couldn’t load team members. Tap to retry.
                  </button>
                ) : allSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
                ) : (
                  allSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.type === 'group' ? suggestion.id : suggestion.user_id}
                      className={cn(
                        'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors',
                        index === mentionIndex && 'bg-accent'
                      )}
                      onClick={() => {
                        const name = suggestion.type === 'group' ? suggestion.name : getMentionHandle(suggestion);
                        insertMention(name);
                      }}
                    >
                      {suggestion.type === 'group' ? (
                        <>
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <AtSign className="h-3 w-3 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">@{suggestion.name}</div>
                            <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(suggestion.display_name || suggestion.email)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">@{getMentionHandle(suggestion)}</div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.display_name || suggestion.email.split('@')[0]}
                            </div>
                          </div>
                        </>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // Prevent iOS from scrolling the document to show the input
                  // Reset any scroll and then scroll our messages container
                  requestAnimationFrame(() => {
                    window.scrollTo(0, 0);
                    scrollToBottom();
                  });
                }}
                placeholder="Type a message... Use @ to mention"
                className="flex-1 min-w-0"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Quick Actions Tab Bar */}
          <ChatQuickActions 
            variant="staff" 
            onMentionInsert={insertMention}
            onlineCount={typingUsers.length}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffMessages() {
  return (
    <AdminLayout>
      <StaffMessagesContent />
    </AdminLayout>
  );
}
