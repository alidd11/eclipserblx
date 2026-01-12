import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, Shield, Users, Paperclip, X, Image, FileText, Loader2, Upload, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { KeyboardDebugOverlay } from '@/components/admin/KeyboardDebugOverlay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useDropZone } from '@/hooks/useDropZone';
import { useIOSKeyboardFix } from '@/hooks/useIOSKeyboardFix';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { hapticTap, hapticError } from '@/lib/haptics';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
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
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // iOS keyboard fix for PWA - now only provides visibility state for scroll behavior
  const { isKeyboardVisible } = useIOSKeyboardFix();

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
      // Get all users with admin role
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

    // Check for group mentions
    const hasEveryone = mentions.includes('everyone');

    let targetUserIds: string[] = [];

    if (hasEveryone) {
      // Notify all admins except sender
      targetUserIds = allAdmins
        .filter(a => a.user_id !== senderId)
        .map(a => a.user_id);
    } else {
      // Find specific mentioned admins
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
      console.log('Admin mention notifications sent to', targetUserIds.length, 'users');
    } catch (err) {
      console.error('Failed to send admin mention notifications:', err);
    }
  };

  // Upload file to storage
  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user?.id) return null;

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
    mutationFn: async ({ message, attachmentUrl }: { message: string; attachmentUrl: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('admin_chat_messages' as any)
        .insert({
          user_id: user.id,
          message: message.trim() || (attachmentUrl ? '📎 Attachment' : ''),
          attachment_url: attachmentUrl,
        });
      
      if (error) throw error;

      // Send notifications to mentioned admins
      if (message.trim()) {
        await sendMentionNotifications(message.trim(), user.id);
      }
    },
    onSuccess: () => {
      hapticTap();
      setNewMessage('');
      setSelectedFile(null);
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
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
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
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const handleViewportChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scrollToBottom());
    };

    vv.addEventListener('resize', handleViewportChange);
    vv.addEventListener('scroll', handleViewportChange);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener('resize', handleViewportChange);
      vv.removeEventListener('scroll', handleViewportChange);
    };
  }, [scrollToBottom]);

  // Extra reliability: when keyboard state changes, force scroll to latest.
  useEffect(() => {
    if (!isKeyboardVisible) return;

    scrollToBottom();
    const t1 = window.setTimeout(scrollToBottom, 100);
    const t2 = window.setTimeout(scrollToBottom, 250);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isKeyboardVisible, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
        }
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
            // Track all online admins
            if (presence.user_id && presence.name) {
              online.push({
                user_id: presence.user_id,
                name: presence.name,
              });
            }
            // Track typing admins (excluding self)
            if (presence.typing && presence.user_id !== user.id) {
              typing.push({
                user_id: presence.user_id,
                name: presence.name,
              });
            }
          });
        });
        
        // Dedupe online admins by user_id
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
    if (atPos === -1) return;

    const newText = textBeforeCursor.slice(0, atPos) + `@${name} ` + textAfterCursor;
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    setMentionFilter('');

    // Focus back on input
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
    // Check file size (max 10MB)
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
        attachmentUrl 
      });
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
  };

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
    <div className="h-full flex flex-col overflow-hidden px-0 sm:px-4 sm:pb-0 pb-[env(safe-area-inset-bottom)]" style={{ backgroundColor: 'var(--card)' }}>
      <KeyboardDebugOverlay />
      {/* Header */}
      <div className="flex items-center justify-between py-2 sm:py-4 px-3 sm:px-0 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Admin Chat</h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            Private channel for administrators only • Use @mentions to notify
            {onlineAdmins.length > 0 && (
              <span className="text-green-400 ml-2">• {onlineAdmins.length} online</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">Admins Only</span>
        </div>
      </div>

      {/* Chat Card - fills remaining space, flush edge-to-edge on mobile */}
      <Card 
        className={cn(
          "bg-card/50 backdrop-blur border-border/50 flex-1 flex flex-col min-h-0 overflow-hidden transition-colors rounded-none sm:rounded-lg border-x-0 sm:border-x sm:border-b sm:mb-4",
          isDragOver && "border-primary border-2 bg-primary/5"
        )}
        {...dragProps}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-12 w-12 animate-bounce" />
              <span className="text-lg font-medium">Drop file here</span>
            </div>
          </div>
        )}
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 flex-shrink-0">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Admin Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Messages area - fills available space with native scroll */}
          <div 
            ref={scrollRef} 
            className="flex-1 px-3 sm:px-4 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="py-4 flex flex-col">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 space-y-2">
                  <Users className="h-12 w-12 mx-auto opacity-50" />
                  <p>No messages yet.</p>
                  <p className="text-sm">Start a private admin conversation!</p>
                </div>
              ) : (
              messages.map((message, index) => {
                  const isOwn = message.user_id === user?.id;
                  
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
                          <div className="mb-2">
                            {isImageUrl(message.attachment_url) ? (
                              <a 
                                href={message.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={message.attachment_url} 
                                  alt="Attachment" 
                                  className="max-w-full max-h-64 rounded-lg border border-border/50 hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ) : (
                              <a
                                href={message.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                              >
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[150px] sm:max-w-[200px]">
                                  {getFileName(message.attachment_url)}
                                </span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Message text */}
                        {message.message && message.message !== '📎 Attachment' && (
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
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                          onClick={() => deleteMessageMutation.mutate(message.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
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

          {/* Selected file preview */}
          {selectedFile && (
            <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                {selectedFile.type.startsWith('image/') ? (
                  <Image className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm truncate flex-1">{selectedFile.name}</span>
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

          {/* Message input - stays in flex flow, browser handles keyboard resize */}
          <div 
            ref={inputBarRef}
            className="p-3 sm:p-4 border-t border-border/50 relative flex-shrink-0 bg-card/95 backdrop-blur-sm"
          >
            {/* Mention suggestions dropdown */}
            {showMentionSuggestions && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-[60]">
                {isAdminsLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading admins…</div>
                ) : adminsError ? (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
                    onClick={() => refetchAdmins()}
                  >
                    Couldn’t load admins. Tap to retry.
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

            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />

              {/* Attachment button */}
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setTimeout(scrollToBottom, 100)}
                placeholder="Type a message... Use @ to mention"
                className="flex-1 min-w-0"
                disabled={isUploading}
              />
              <Button
                onClick={handleSend}
                disabled={(!newMessage.trim() && !selectedFile) || isUploading || sendMessageMutation.isPending}
                size="icon"
                className="flex-shrink-0"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminChat() {
  return (
    <AdminLayout>
      <AdminChatContent />
    </AdminLayout>
  );
}
