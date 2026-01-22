import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, AtSign, Plus, Paperclip, X, Image, FileText, Loader2 } from 'lucide-react';
import { ChatMessageActions, ChatReaction } from '@/components/admin/ChatMessageActions';
import { QuotedMessage } from '@/components/admin/QuotedMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useIOSKeyboardFix } from '@/hooks/useIOSKeyboardFix';
import { markChatAsRead } from '@/hooks/useChatNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { hapticTap, hapticError } from '@/lib/haptics';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

type AppRole = Database['public']['Enums']['app_role'];

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
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

// Helper to check if URL is an image
const isImageUrl = (url: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext));
};

// Helper to get file name from URL
const getFileName = (url: string): string => {
  try {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
  } catch {
    return 'attachment';
  }
};

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

    const hasEveryone = mentions.includes('everyone');
    const hasHere = mentions.includes('here');

    let targetUserIds: string[] = [];

    if (hasEveryone || hasHere) {
      targetUserIds = allStaff
        .filter(s => s.user_id !== senderId)
        .map(s => s.user_id);
    } else {
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
    } catch (err) {
      console.error('Failed to send mention notifications:', err);
    }
  };

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    toast.info('Scanning file...', { id: 'staff-chat-scan' });
    const scanResult = await performSecurityScan(file);
    
    if (!scanResult.isAllowed) {
      toast.dismiss('staff-chat-scan');
      toast.error(scanResult.reason || 'File blocked by security scan');
      return null;
    }
    
    toast.dismiss('staff-chat-scan');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('staff-chat-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('staff-chat-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
    e.target.value = '';
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachmentUrl, replyToId }: { message: string; attachmentUrl: string | null; replyToId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('staff_chat_messages')
        .insert({
          user_id: user.id,
          message: message.trim() || (attachmentUrl ? '📎 Attachment' : ''),
          attachment_url: attachmentUrl,
          reply_to_id: replyToId,
        });
      
      if (error) throw error;

      if (message.trim()) {
        await sendMentionNotifications(message.trim(), user.id);
      }
    },
    onSuccess: () => {
      hapticTap();
      setNewMessage('');
      setSelectedFile(null);
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

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Handle viewport resize for keyboard - scroll chat to bottom when keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;
    let timers: number[] = [];

    const handleViewportResize = () => {
      const heightDelta = Math.abs(vv.height - lastHeight);
      // Only react to significant height changes (keyboard open/close)
      if (heightDelta > 50) {
        lastHeight = vv.height;
        // Clear any pending scroll timers
        timers.forEach(t => clearTimeout(t));
        // Staggered scrolls to handle iOS keyboard animation settling
        timers = [
          window.setTimeout(scrollToBottom, 0),
          window.setTimeout(scrollToBottom, 100),
          window.setTimeout(scrollToBottom, 250),
          window.setTimeout(scrollToBottom, 400),
        ];
      }
    };

    vv.addEventListener('resize', handleViewportResize);

    return () => {
      timers.forEach(t => clearTimeout(t));
      vv.removeEventListener('resize', handleViewportResize);
    };
  }, [scrollToBottom]);

  // Scroll to bottom when keyboard becomes visible
  useEffect(() => {
    if (!isKeyboardVisible) return;
    
    // Give the viewport time to resize, then scroll chat to bottom
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isKeyboardVisible, scrollToBottom]);

  // Scroll to bottom when mention suggestions appear (ensures input stays visible)
  useEffect(() => {
    if (!showMentionSuggestions) return;

    // On iOS PWA, the visual viewport can scroll independent of the document,
    // causing the input to appear at the "top" of the screen while the actual
    // scroll container shows empty space. We need to:
    // 1. Scroll the messages container to bottom
    // 2. Scroll the input element into view within the visual viewport
    const scrollInputIntoView = () => {
      scrollToBottom();
      // Also ensure the input element itself is visible in the visual viewport
      inputRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' });
    };

    // Staggered scrolls to handle viewport resize during keyboard animation
    const timers = [
      setTimeout(scrollInputIntoView, 0),
      setTimeout(scrollInputIntoView, 100),
      setTimeout(scrollInputIntoView, 200),
      setTimeout(scrollInputIntoView, 350),
      setTimeout(scrollInputIntoView, 500),
    ];

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [showMentionSuggestions, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('staff-chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_chat_messages' },
        () => queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_chat_reactions' },
        () => queryClient.invalidateQueries({ queryKey: ['staff-chat-reactions'] })
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
    const atPos = textBeforeCursor.lastIndexOf('@');
    
    let newText: string;
    if (atPos === -1) {
      const prefix = newMessage.length > 0 && !newMessage.endsWith(' ') ? ' ' : '';
      newText = newMessage + prefix + `@${name} `;
    } else {
      newText = textBeforeCursor.slice(0, atPos) + `@${name} ` + textAfterCursor;
    }
    
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    setMentionFilter('');

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    let attachmentUrl: string | null = null;

    if (selectedFile) {
      setIsUploading(true);
      try {
        attachmentUrl = await uploadFile(selectedFile);
        if (!attachmentUrl && !newMessage.trim()) {
          setIsUploading(false);
          return;
        }
      } catch (err) {
        toast.error('Failed to upload file');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessageMutation.mutate({ 
      message: newMessage, 
      attachmentUrl, 
      replyToId: replyToMessage?.id || null 
    });
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage(message);
      inputRef.current?.focus();
    }
  };

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
      className="flex-1 flex flex-col min-h-0 bg-card"
      style={{ overscrollBehavior: 'none' }}
    >
      {/* iOS-style header with logo */}
      <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 py-3 px-4">
          <EclipseLogo size="sm" />
          <span className="text-sm font-semibold text-foreground">Staff Messages</span>
        </div>
      </div>

      {/* Messages area - fills available space */}
      <div
        ref={scrollRef} 
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4"
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
                        'rounded-2xl px-3 py-2 text-sm break-words',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}
                    >
                      {message.attachment_url && (
                        <div className="mb-2">
                          {isImageUrl(message.attachment_url) ? (
                            <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={message.attachment_url} 
                                alt="Attachment" 
                                className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                              />
                            </a>
                          ) : (
                            <a 
                              href={message.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg",
                                isOwn ? "bg-primary-foreground/10" : "bg-background/50"
                              )}
                            >
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="text-sm truncate max-w-[150px]">
                                {getFileName(message.attachment_url)}
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                      {message.message && message.message !== '📎 Attachment' && renderMessageWithMentions(message.message, { isOwn })}
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
        <div className="px-3 sm:px-4 py-1 text-xs text-muted-foreground flex-shrink-0">
          {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Reply preview */}
      {replyToMessage && (
        <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0 bg-muted/30">
          <QuotedMessage
            message={replyToMessage.message}
            senderName={getDisplayName(replyToMessage.user_id)}
            onClear={() => setReplyToMessage(null)}
          />
        </div>
      )}

      {/* Input bar - iMessage style */}
      <div className="px-3 py-2 sm:px-4 sm:py-3 flex-shrink-0 bg-card pb-[var(--chat-safe-bottom,0px)] relative">
        {/* Mention suggestions */}
        {showMentionSuggestions && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[100]">
            {isStaffLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading team…</div>
            ) : staffError ? (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
                onClick={() => refetchStaff()}
              >
                Couldn't load team members. Tap to retry.
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

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        {/* Selected file preview */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg mb-2">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Lovable-style input bar */}
        <div className="flex gap-2 items-center">
          {/* Plus/Attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 rounded-full h-10 w-10 border border-border/50 bg-muted/30"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Input pill */}
          <div 
            className="flex-1 min-w-0 relative"
            style={{ touchAction: 'manipulation' }}
          >
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => {
                // iOS PWA can ignore the first tap; force focus synchronously within the gesture.
                const input = e.currentTarget;
                if (document.activeElement === input) return;
                try {
                  input.focus({ preventScroll: true });
                } catch {
                  input.focus();
                }
              }}
              onTouchStart={(e) => {
                // Force focus on first touch to work around iOS PWA tap-blocking.
                // NOTE: must be synchronous (no rAF/setTimeout) to count as a user gesture.
                const input = e.currentTarget;
                if (document.activeElement === input) return;
                try {
                  input.focus({ preventScroll: true });
                } catch {
                  input.focus();
                }
              }}
              onFocus={() => {
                // Keep the message list pinned to the bottom and ensure input is visible.
                const scrollAll = () => {
                  scrollToBottom();
                  inputRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' });
                };
                requestAnimationFrame(() => {
                  scrollAll();
                  setTimeout(scrollAll, 150);
                  setTimeout(scrollAll, 350);
                  setTimeout(scrollAll, 650);
                });
              }}
              placeholder="Message..."
              className="w-full rounded-full bg-muted/50 border-0 focus-visible:ring-1 pr-10"
              disabled={isUploading}
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedFile) || isUploading || sendMessageMutation.isPending}
            size="icon"
            className="flex-shrink-0 rounded-full h-10 w-10"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
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
