import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, X, Image, FileText, Loader2, Upload, AtSign, Plus } from 'lucide-react';
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
import { useDropZone } from '@/hooks/useDropZone';
import { useIOSKeyboardFix } from '@/hooks/useIOSKeyboardFix';
import { markChatAsRead } from '@/hooks/useChatNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { hapticTap, hapticError } from '@/lib/haptics';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { EclipseLogo } from '@/components/ui/EclipseLogo';

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

interface AdminMember {
  user_id: string;
  display_name: string | null;
  email: string;
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

// Parse @mentions from message text
const parseMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
};

// Get mention handle from admin member
const getMentionHandle = (admin: AdminMember): string => {
  const base = (admin.display_name || admin.email.split('@')[0] || 'admin').toLowerCase();
  return base.replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'admin';
};

// Check if a mention matches an admin member
const matchesMention = (admin: AdminMember, mentionHandle: string): boolean => {
  const normalizedMention = mentionHandle.toLowerCase().replace(/_/g, '');
  const handle = getMentionHandle(admin).replace(/_/g, '');
  const displayName = (admin.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const emailPrefix = admin.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
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
  { id: 'everyone', name: 'everyone', description: 'Notify all admins' },
];

interface OnlineAdmin {
  user_id: string;
  name: string;
}

function AdminChatContent() {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { isKeyboardVisible } = useIOSKeyboardFix();

  // Detect PWA mode
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );

  // Mark messages as read when component mounts
  useEffect(() => {
    if (user) {
      markChatAsRead('admin', user.id);
    }
  }, [user]);

  // Fetch messages from admin_chat_messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-chat-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_chat_messages' as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as unknown as ChatMessage[];
    },
    enabled: isAdmin,
  });

  // Fetch user profiles for message authors
  const { data: profiles = {} } = useQuery({
    queryKey: ['admin-chat-profiles', messages.map(m => m.user_id)],
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
    enabled: messages.length > 0 && isAdmin,
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

  // Fetch all admin members for @mentions
  const {
    data: allAdmins = [],
    isLoading: isAdminsLoading,
    error: adminsError,
    refetch: refetchAdmins,
  } = useQuery({
    queryKey: ['all-admin-members'],
    queryFn: async () => {
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;
      if (!adminRoles?.length) return [];

      const adminUserIds = adminRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', adminUserIds);

      if (profilesError) throw profilesError;
      return (profiles || []) as AdminMember[];
    },
    enabled: isAdmin,
  });

  // Filtered admins for mentions
  const filteredGroupMentions = GROUP_MENTIONS.filter(g => 
    g.name.includes(mentionFilter.toLowerCase())
  );
  
  const filteredAdmins = allAdmins.filter(admin => {
    if (admin.user_id === user?.id) return false;
    const display = (admin.display_name || admin.email.split('@')[0]).toLowerCase();
    const handle = getMentionHandle(admin);
    const q = mentionFilter.toLowerCase();
    return display.includes(q) || handle.includes(q);
  });

  // Combined suggestions
  const allSuggestions = [
    ...filteredGroupMentions.map(g => ({ type: 'group' as const, ...g })),
    ...filteredAdmins.map(a => ({ type: 'admin' as const, ...a })),
  ];

  // Send push notification to mentioned admins
  const sendMentionNotifications = async (message: string, senderId: string) => {
    const mentions = parseMentions(message);
    if (mentions.length === 0) return;

    const senderProfile = currentUserProfile;
    const senderName = senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Someone';

    const hasEveryone = mentions.includes('everyone');

    let targetUserIds: string[] = [];

    if (hasEveryone) {
      targetUserIds = allAdmins
        .filter(a => a.user_id !== senderId)
        .map(a => a.user_id);
    } else {
      targetUserIds = allAdmins
        .filter(admin => {
          if (admin.user_id === senderId) return false;
          return mentions.some(mention => matchesMention(admin, mention));
        })
        .map(a => a.user_id);
    }

    if (targetUserIds.length === 0) return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: targetUserIds,
          payload: {
            title: `${senderName} mentioned you in Admin Chat`,
            body: message.length > 100 ? message.substring(0, 100) + '...' : message,
            tag: `admin-chat-mention-${Date.now()}`,
            url: '/admin/chat',
            requireInteraction: true,
          },
        },
      });
    } catch (err) {
      console.error('Failed to send admin mention notifications:', err);
    }
  };

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

    toast.info('Scanning file...', { id: 'admin-chat-scan' });
    const scanResult = await performSecurityScan(file);
    
    if (!scanResult.isAllowed) {
      toast.dismiss('admin-chat-scan');
      toast.error(scanResult.reason || 'File blocked by security scan');
      return null;
    }
    
    toast.dismiss('admin-chat-scan');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('admin-chat-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('admin-chat-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, attachmentUrl, replyToId }: { message: string; attachmentUrl: string | null; replyToId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('admin_chat_messages' as any)
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
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
    },
    onError: () => {
      hapticError();
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('admin_chat_messages' as any)
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      hapticTap();
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
    },
  });

  // Fetch reactions for all messages
  const { data: reactions = [] } = useQuery({
    queryKey: ['admin-chat-reactions', messages.map(m => m.id)],
    queryFn: async () => {
      if (!messages.length) return [];
      const messageIds = messages.map(m => m.id);
      
      const { data, error } = await supabase
        .from('admin_chat_reactions' as any)
        .select('*')
        .in('message_id', messageIds);
      
      if (error) throw error;
      return (data || []) as unknown as ChatReaction[];
    },
    enabled: messages.length > 0 && isAdmin,
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('admin_chat_reactions' as any)
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-reactions'] });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (reactionId: string) => {
      const { error } = await supabase
        .from('admin_chat_reactions' as any)
        .delete()
        .eq('id', reactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-reactions'] });
    },
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll on new messages - use multiple staggered scrolls to ensure content is rendered
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Use requestAnimationFrame to wait for DOM to be painted
    const raf = requestAnimationFrame(() => {
      scrollToBottom();
    });
    
    // Multiple staggered scrolls to handle async rendering
    const timers = [
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 150),
      setTimeout(scrollToBottom, 300),
      setTimeout(scrollToBottom, 500),
    ];
    
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(t => clearTimeout(t));
    };
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
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_chat_messages' },
        () => queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_chat_reactions' },
        () => queryClient.invalidateQueries({ queryKey: ['admin-chat-reactions'] })
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isAdmin]);

  // Presence for typing indicators and online admins
  useEffect(() => {
    if (!user?.id || !currentUserProfile || !isAdmin) return;

    const presenceChannel = supabase.channel('admin-chat-presence');
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingUser[] = [];
        const online: OnlineAdmin[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id && presence.name) {
              online.push({
                user_id: presence.user_id,
                name: presence.name,
              });
            }
            if (presence.typing && presence.user_id !== user.id) {
              typing.push({
                user_id: presence.user_id,
                name: presence.name,
              });
            }
          });
        });
        
        const uniqueOnline = online.filter((admin, index, arr) => 
          arr.findIndex(a => a.user_id === admin.user_id) === index
        );
        
        setOnlineAdmins(uniqueOnline);
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
  }, [user?.id, currentUserProfile, isAdmin]);

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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Process file (shared by file input and drag-drop)
  const processFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 10MB' });
      return;
    }
    setSelectedFile(file);
  }, []);

  // Drag and drop support
  const { isDragOver, dragProps } = useDropZone({
    onDrop: (files) => {
      if (files[0]) {
        processFile(files[0]);
      }
    },
    accept: ['image/*', '.pdf', '.doc', '.docx', '.txt', '.zip'],
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    setIsUploading(true);
    try {
      let attachmentUrl: string | null = null;
      
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
      }

      await sendMessageMutation.mutateAsync({ 
        message: newMessage, 
        attachmentUrl,
        replyToId: replyToMessage?.id || null
      });
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
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
    return profile?.display_name || profile?.email?.split('@')[0] || 'Admin';
  };

  const getInitials = (userId: string) => {
    const name = getDisplayName(userId);
    return name.slice(0, 2).toUpperCase();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div 
      className={cn(
        "flex-1 flex flex-col min-h-0 bg-card transition-colors",
        isDragOver && "ring-2 ring-primary ring-inset"
      )}
      style={{ overscrollBehavior: 'none' }}
      {...dragProps}
    >
      {/* iOS-style header with logo */}
      <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 py-3 px-4">
          <EclipseLogo size="sm" />
          <span className="text-sm font-semibold text-foreground">Admin Chat</span>
        </div>
      </div>

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-12 w-12 animate-bounce" />
            <span className="text-lg font-medium">Drop file here</span>
          </div>
        </div>
      )}

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
            <div className="text-center text-muted-foreground py-8 space-y-2">
              <p>No messages yet.</p>
              <p className="text-sm">Start a private admin conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwn = message.user_id === user?.id;
              
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const isGrouped = prevMessage && 
                prevMessage.user_id === message.user_id &&
                (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) <= 30000;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2 sm:gap-3 group min-w-0 max-w-full',
                    isOwn && 'flex-row-reverse',
                    isGrouped ? 'mt-0.5' : index > 0 ? 'mt-4' : ''
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
                  <div className={cn('flex flex-col max-w-[75%] sm:max-w-[70%] min-w-0', isOwn ? 'items-end' : 'items-start')}>
                    {!isGrouped && (
                      <div className="flex items-center gap-2 mb-1 flex-wrap min-w-0 max-w-full">
                        <span className="text-xs sm:text-sm font-medium text-foreground">
                          {getDisplayName(message.user_id)}
                        </span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs py-0 bg-red-500/20 text-red-400 border-red-500/30">
                          Admin
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    
                    {/* Attachment preview */}
                    {message.attachment_url && (
                      <div className="mb-2 max-w-full min-w-0">
                        {isImageUrl(message.attachment_url) ? (
                          <a 
                            href={message.attachment_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block max-w-full"
                          >
                            <img 
                              src={message.attachment_url} 
                              alt="Attachment" 
                              className="block max-w-full max-h-64 rounded-lg border border-border/50 hover:opacity-90 transition-opacity object-contain"
                            />
                          </a>
                        ) : (
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors max-w-full min-w-0 overflow-hidden"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate min-w-0 max-w-[150px] sm:max-w-[200px]">
                              {getFileName(message.attachment_url)}
                            </span>
                          </a>
                        )}
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

                    {/* Message text */}
                    {message.message && message.message !== '📎 Attachment' && (
                      <div
                        onClick={isPWA ? () => setOpenActionsId(message.id) : undefined}
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words max-w-full',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md',
                          isPWA && 'cursor-pointer active:opacity-80 transition-opacity'
                        )}
                      >
                        {renderMessageWithMentions(message.message, { isOwn })}
                      </div>
                    )}
                    
                    <ChatMessageActions
                      messageId={message.id}
                      isOwn={isOwn}
                      canDelete={true}
                      reactions={reactions.filter(r => r.message_id === message.id)}
                      currentUserId={user?.id || ''}
                      onAddReaction={(msgId, emoji) => addReactionMutation.mutate({ messageId: msgId, emoji })}
                      onRemoveReaction={(reactionId) => removeReactionMutation.mutate(reactionId)}
                      onDelete={(msgId) => deleteMessageMutation.mutate(msgId)}
                      onReply={handleReply}
                      isPWA={isPWA}
                      isOpen={openActionsId === message.id}
                      onOpenChange={(open) => setOpenActionsId(open ? message.id : null)}
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

      {/* Selected file preview */}
      {selectedFile && (
        <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0 bg-muted/30">
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg min-w-0 overflow-hidden">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm truncate flex-1 min-w-0">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
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
            {isAdminsLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading admins…</div>
            ) : adminsError ? (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
                onClick={() => refetchAdmins()}
              >
                Couldn't load admins. Tap to retry.
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
                        <AvatarFallback className="text-xs bg-red-500/20 text-red-400">
                          {(suggestion.display_name || suggestion.email.split('@')[0]).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-sm">@{getMentionHandle(suggestion)}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {suggestion.display_name || suggestion.email.split('@')[0]}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] py-0 bg-red-500/20 text-red-400 border-red-500/30"
                      >
                        Admin
                      </Badge>
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

        {/* Modern input bar */}
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

export default function AdminChat() {
  return (
    <AdminLayout requiredPermissions={['view_admin_chat']}>
      <AdminChatContent />
    </AdminLayout>
  );
}
