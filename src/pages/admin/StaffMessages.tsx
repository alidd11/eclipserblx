import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Users, AtSign, Circle, Loader2, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { notifyStaffMention } from '@/lib/pushNotifications';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface MessageRead {
  message_id: string;
  user_id: string;
  read_at: string;
}

interface StaffProfile {
  user_id: string;
  display_name: string | null;
  email: string;
  last_seen?: string | null;
}

interface TypingUser {
  user_id: string;
  name: string;
}

interface OnlineStaffUser {
  user_id: string;
  name: string;
  typing: boolean;
}

// Convert a staff profile into a safe @mention handle (no spaces, only [a-z0-9_])
const getMentionHandle = (profile: StaffProfile): string => {
  const base = (profile.display_name || profile.email.split('@')[0] || 'staff').toLowerCase();
  const handle = base
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return handle || 'staff';
};

// Parse @mentions from message text (keep original case for display, normalize for matching)
const parseMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
};

// Match a mention handle against a staff profile (flexible matching)
const matchesMention = (profile: StaffProfile, mentionHandle: string): boolean => {
  const normalizedMention = mentionHandle.toLowerCase().replace(/_/g, '');
  const handle = getMentionHandle(profile).replace(/_/g, '');
  const displayName = (profile.display_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const emailPrefix = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return handle === normalizedMention || 
         displayName === normalizedMention || 
         emailPrefix === normalizedMention ||
         handle.includes(normalizedMention) ||
         displayName.includes(normalizedMention);
};

// Check for group mentions
const hasGroupMention = (text: string): { everyone: boolean; here: boolean } => {
  const mentions = parseMentions(text);
  return {
    everyone: mentions.includes('everyone'),
    here: mentions.includes('here'),
  };
};

// Group mention options
const GROUP_MENTIONS = [
  { id: 'everyone', name: 'everyone', description: 'Notify all staff members' },
  { id: 'here', name: 'here', description: 'Notify all online staff' },
];

export default function StaffMessages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineStaffUser[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Swipe tracking for mobile
  const swipeStartY = useRef<number | null>(null);
  const swipeStartX = useRef<number | null>(null);
  
  // Notification hooks
  const { playSound } = useNotificationSound();
  const { sendNotification, requestPermission, permission } = usePushNotifications();

  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Fetch messages (using staff_messages table with recipient_id = null for general chat)
  const { data: messages, isLoading } = useQuery({
    queryKey: ['staff-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_messages')
        .select('id, sender_id, message, created_at')
        .is('recipient_id', null)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  // Fetch read receipts for messages
  const { data: messageReads } = useQuery({
    queryKey: ['staff-message-reads', messages?.map(m => m.id)],
    queryFn: async () => {
      if (!messages?.length) return {};
      const messageIds = messages.map(m => m.id).filter(id => !id.startsWith('optimistic-'));
      
      if (messageIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('staff_message_reads')
        .select('message_id, user_id, read_at')
        .in('message_id', messageIds);
      
      if (error) throw error;
      
      // Group reads by message_id
      const readsByMessage: Record<string, MessageRead[]> = {};
      data?.forEach((read: MessageRead) => {
        if (!readsByMessage[read.message_id]) {
          readsByMessage[read.message_id] = [];
        }
        readsByMessage[read.message_id].push(read);
      });
      
      return readsByMessage;
    },
    enabled: !!messages?.length,
  });

  // Fetch staff profiles
  const { data: profiles } = useQuery({
    queryKey: ['staff-profiles', messages?.map(m => m.sender_id)],
    queryFn: async () => {
      if (!messages?.length) return {};
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', senderIds);
      
      if (error) throw error;
      
      return Object.fromEntries(
        data.map(p => [p.user_id, p])
      ) as Record<string, StaffProfile>;
    },
    enabled: !!messages?.length,
  });

  // Fetch all staff members for @mentions
  const { data: allStaff } = useQuery({
    queryKey: ['all-staff-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-staff');
      if (error) throw error;
      return (data?.staff ?? []) as StaffProfile[];
    },
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
      return data as StaffProfile;
    },
    enabled: !!user?.id,
  });

  // Fetch online staff count
  const { data: onlineCount } = useQuery({
    queryKey: ['staff-online-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Get filtered staff for mentions (including group mentions)
  const filteredGroupMentions = GROUP_MENTIONS.filter(g => 
    g.name.includes(mentionFilter.toLowerCase())
  );
  
  const filteredStaff = allStaff?.filter(staff => {
    if (staff.user_id === user?.id) return false;
    const display = (staff.display_name || staff.email.split('@')[0]).toLowerCase();
    const handle = getMentionHandle(staff);
    const q = mentionFilter.toLowerCase();
    return display.includes(q) || handle.includes(q);
  }) || [];

  // Check if user is mentioned in a message (including group mentions)
  const isUserMentioned = useCallback((message: string, userId: string): boolean => {
    // Group mentions
    const groupMentions = hasGroupMention(message);
    if (groupMentions.everyone || groupMentions.here) return true;

    if (!allStaff) return false;

    const mentions = parseMentions(message);
    const userProfile = allStaff.find(s => s.user_id === userId);
    if (!userProfile) return false;

    // Use flexible matching
    return mentions.some(mentionHandle => matchesMention(userProfile, mentionHandle));
  }, [allStaff]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    onMutate: async (message: string) => {
      if (!user?.id) return { previous: undefined as ChatMessage[] | undefined };

      await queryClient.cancelQueries({ queryKey: ['staff-chat'] });
      const previous = queryClient.getQueryData<ChatMessage[]>(['staff-chat']);

      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        sender_id: user.id,
        message,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(['staff-chat'], (old = []) => {
        const next = [...old, optimistic];
        return next.slice(-100);
      });

      return { previous };
    },
    mutationFn: async (message: string) => {
      if (!user?.id) {
        throw new Error('You must be logged in to send messages');
      }

      const { error } = await supabase
        .from('staff_messages')
        .insert({
          sender_id: user.id,
          recipient_id: null,
          subject: 'Staff Chat',
          message,
        });

      if (error) {
        console.error('Failed to send staff message:', error);
        throw error;
      }
    },
    onSuccess: () => {
      setNewMessage('');
      setShowMentionSuggestions(false);
      
      // On mobile, blur to hide keyboard and prevent layout shift
      // On desktop, keep focus for quick follow-up messages
      if (isMobile) {
        inputRef.current?.blur();
      } else {
        inputRef.current?.focus();
      }

      // Stop typing indicator when message is sent
      if (presenceChannelRef.current && user?.id) {
        presenceChannelRef.current.track({
          typing: false,
          user_id: user.id,
          name: getCurrentUserName(),
        });
      }

      // Ensure UI updates even if realtime isn't delivering events
      queryClient.invalidateQueries({ queryKey: ['staff-chat'] });
    },
    onError: (error, _message, context) => {
      console.error('Send message error:', error);
      if (context?.previous) {
        queryClient.setQueryData(['staff-chat'], context.previous);
      }
      toast.error('Failed to send message');
    },
  });

  // Get display name for current user
  const getCurrentUserName = useCallback(() => {
    if (!currentUserProfile) return 'Staff';
    return currentUserProfile.display_name || 'Staff Member';
  }, [currentUserProfile]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!presenceChannelRef.current || !user?.id) return;

    // Track that user is typing
    presenceChannelRef.current.track({
      typing: true,
      user_id: user.id,
      name: getCurrentUserName(),
    });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current && user?.id) {
        presenceChannelRef.current.track({
          typing: false,
          user_id: user.id,
          name: getCurrentUserName(),
        });
      }
    }, 2000);
  }, [user?.id, getCurrentUserName]);

  // Real-time subscription for messages with notifications
  useEffect(() => {
    const channel = supabase
      .channel('staff-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_messages',
          filter: 'recipient_id=is.null',
        },
        async (payload) => {
          const newMsg = payload.new as { sender_id: string; message: string };
          
          // Only notify for messages from other staff members
          if (newMsg.sender_id !== user?.id) {
            // Check if current user is mentioned
            const isMentioned = user?.id ? isUserMentioned(newMsg.message, user.id) : false;
            
            // Always play sound, but louder/different for mentions
            playSound();
            
            // Send push notification if tab is not focused OR if mentioned
            if (document.hidden || isMentioned) {
              const senderProfile = profiles?.[newMsg.sender_id];
              const senderName = senderProfile?.display_name || 'Staff Member';
              
              if (isMentioned) {
                sendNotification('🔔 You were mentioned!', {
                  body: `${senderName}: ${newMsg.message.substring(0, 100)}`,
                  tag: 'staff-chat-mention',
                  requireInteraction: true,
                });
                // Show toast for mentions even when focused
                if (!document.hidden) {
                  toast.info(`${senderName} mentioned you in staff chat`);
                }
              } else {
                sendNotification('New Staff Message', {
                  body: `${senderName}: ${newMsg.message.substring(0, 100)}`,
                  tag: 'staff-chat-message',
                });
              }
            }

            // Send background push notifications for mentions
            if (allStaff) {
              const senderProfile = profiles?.[newMsg.sender_id];
              const senderName = senderProfile?.display_name || 'Staff Member';
              const mentions = parseMentions(newMsg.message);
              const groupMentions = hasGroupMention(newMsg.message);
              
              // Find mentioned user IDs
              const mentionedUserIds: string[] = [];
              
              if (groupMentions.everyone) {
                // Notify all staff except sender
                allStaff.forEach(staff => {
                  if (staff.user_id !== newMsg.sender_id) {
                    mentionedUserIds.push(staff.user_id);
                  }
                });
              } else if (groupMentions.here) {
                // Notify online staff except sender
                onlineUsers.forEach(online => {
                  if (online.user_id !== newMsg.sender_id) {
                    mentionedUserIds.push(online.user_id);
                  }
                });
              } else {
                // Notify individually mentioned staff (use flexible matching)
                mentions.forEach(mentionHandle => {
                  const mentionedStaff = allStaff.find(s => matchesMention(s, mentionHandle));
                  if (mentionedStaff && mentionedStaff.user_id !== newMsg.sender_id) {
                    mentionedUserIds.push(mentionedStaff.user_id);
                  }
                });
              }

              // Send background push to mentioned users
              if (mentionedUserIds.length > 0) {
                try {
                  await notifyStaffMention(
                    mentionedUserIds,
                    senderName,
                    newMsg.message
                  );
                } catch (error) {
                  console.error('Failed to send background push for mention:', error);
                }
              }
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['staff-chat'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, profiles, playSound, sendNotification, isUserMentioned, allStaff, onlineUsers]);

  // Update last_seen when user is active
  useEffect(() => {
    if (!user?.id) return;

    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    };

    // Update immediately on mount
    updateLastSeen();

    // Update periodically while active (every 30 seconds)
    const interval = setInterval(updateLastSeen, 30000);

    // Update on activity
    const handleActivity = () => updateLastSeen();
    window.addEventListener('focus', handleActivity);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActivity);
    };
  }, [user?.id]);

  // Presence channel for online + typing indicators
  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel('staff-chat-presence', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingUser[] = [];
        const online: OnlineStaffUser[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          const presence = (presences as any[])[0] || {};
          const staffProfile = allStaff?.find(s => s.user_id === key) || profiles?.[key];
          const name =
            presence?.name ||
            staffProfile?.display_name ||
            'Staff Member';

          const isTyping = !!presence?.typing;
          online.push({ user_id: key, name, typing: isTyping });

          if (key !== user.id && isTyping) {
            typing.push({ user_id: key, name });
          }
        });

        online.sort((a, b) => {
          if (a.user_id === user.id) return -1;
          if (b.user_id === user.id) return 1;
          return a.name.localeCompare(b.name);
        });

        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            typing: false,
            user_id: user.id,
            name: getCurrentUserName(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
      setOnlineUsers([]);
      setTypingUsers([]);
    };
  }, [user?.id, allStaff, profiles, getCurrentUserName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user?.id || !messages?.length) return;
    
    // Find messages not sent by current user and not yet read by current user
    const unreadMessageIds = messages
      .filter(msg => {
        if (msg.sender_id === user.id) return false; // Skip own messages
        if (msg.id.startsWith('optimistic-')) return false; // Skip optimistic messages
        const reads = messageReads?.[msg.id] || [];
        return !reads.some(r => r.user_id === user.id);
      })
      .map(msg => msg.id);
    
    if (unreadMessageIds.length === 0) return;
    
    // Mark messages as read
    const markAsRead = async () => {
      const inserts = unreadMessageIds.map(messageId => ({
        message_id: messageId,
        user_id: user.id,
      }));
      
      const { error } = await supabase
        .from('staff_message_reads')
        .upsert(inserts, { onConflict: 'message_id,user_id' });
      
      if (error) {
        console.error('Failed to mark messages as read:', error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['staff-message-reads'] });
      }
    };
    
    markAsRead();
  }, [messages, messageReads, user?.id, queryClient]);

  // Real-time subscription for read receipts
  useEffect(() => {
    const channel = supabase
      .channel('staff-message-reads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_message_reads',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-message-reads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Swipe down handler for mobile to navigate back
  const handleSwipeStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    swipeStartY.current = e.touches[0].clientY;
    swipeStartX.current = e.touches[0].clientX;
  }, [isMobile]);

  const handleSwipeEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || swipeStartY.current === null || swipeStartX.current === null) return;
    
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    const deltaX = Math.abs(e.changedTouches[0].clientX - swipeStartX.current);
    
    // Swipe down with minimal horizontal movement to trigger sidebar
    if (deltaY > 80 && deltaX < 50) {
      // This will be handled by AdminLayout's left-edge swipe
      // But we can use window.history or other navigation if needed
    }
    
    swipeStartY.current = null;
    swipeStartX.current = null;
  }, [isMobile]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Use setTimeout to ensure we get the correct cursor position after React updates
    setTimeout(() => {
      const cursorPos = inputRef.current?.selectionStart ?? value.length;
      setCursorPosition(cursorPos);
      
      // Check for @mention trigger
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setMentionFilter(mentionMatch[1]);
        setShowMentionSuggestions(true);
        setMentionIndex(0);
      } else {
        setShowMentionSuggestions(false);
      }
    }, 0);
    
    if (value.trim()) {
      handleTyping();
    }
  };

  const insertMention = (staff: StaffProfile) => {
    // Get current cursor position from the input directly
    const currentCursor = inputRef.current?.selectionStart || cursorPosition;
    const textBeforeCursor = newMessage.slice(0, currentCursor);
    const textAfterCursor = newMessage.slice(currentCursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const mentionName = getMentionHandle(staff);
      const newText = `${beforeMention}@${mentionName} ${textAfterCursor}`;
      setNewMessage(newText);
      setShowMentionSuggestions(false);
      
      // Focus input and set cursor position after mention
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = beforeMention.length + mentionName.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          setCursorPosition(newCursorPos);
        }
      }, 0);
    }
  };

  const insertGroupMention = (mentionName: string) => {
    // Get current cursor position from the input directly
    const currentCursor = inputRef.current?.selectionStart || cursorPosition;
    const textBeforeCursor = newMessage.slice(0, currentCursor);
    const textAfterCursor = newMessage.slice(currentCursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, -mentionMatch[0].length);
      const newText = `${beforeMention}@${mentionName} ${textAfterCursor}`;
      setNewMessage(newText);
      setShowMentionSuggestions(false);
      
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = beforeMention.length + mentionName.length + 2;
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          setCursorPosition(newCursorPos);
        }
      }, 0);
    }
  };

  // Total suggestions count for keyboard navigation
  const totalSuggestions = filteredGroupMentions.length + filteredStaff.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only intercept keys if mention suggestions are shown
    if (!showMentionSuggestions || totalSuggestions === 0) {
      return; // Let the form handle Enter normally
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(prev => Math.min(prev + 1, totalSuggestions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Tab') {
      // Use Tab to select mention while keeping Enter for sending messages
      e.preventDefault();
      e.stopPropagation();
      // Handle selection based on index
      if (mentionIndex < filteredGroupMentions.length) {
        insertGroupMention(filteredGroupMentions[mentionIndex].name);
      } else {
        const staffIndex = mentionIndex - filteredGroupMentions.length;
        if (filteredStaff[staffIndex]) {
          insertMention(filteredStaff[staffIndex]);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMentionSuggestions(false);
    }
  };

  // Render message with highlighted mentions
  const renderMessage = (text: string, isOwnMessage: boolean = false) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentionedHandle = part.slice(1).toLowerCase();
        const isGroupMention = mentionedHandle === 'everyone' || mentionedHandle === 'here';
        // Use flexible matching to determine if current user is mentioned
        const isCurrentUser = currentUserProfile ? matchesMention(currentUserProfile, mentionedHandle) : false;

        return (
          <span
            key={i}
            className={cn(
              'font-semibold px-1 rounded',
              isGroupMention
                ? 'text-destructive bg-destructive/15'
                : isOwnMessage
                  ? 'text-primary-foreground underline decoration-primary-foreground/50'
                  : isCurrentUser
                    ? 'text-primary bg-primary/15'
                    : 'text-primary'
            )}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getInitials = (profile: StaffProfile | undefined) => {
    if (!profile) return '?';
    if (profile.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'SM';
  };

  const getName = (senderId: string) => {
    const profile = profiles?.[senderId];
    return profile?.display_name || 'Staff Member';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Show "Offline" if more than 1 hour ago
    if (diffHours >= 1) return 'Offline';
    if (diffMins < 1) return 'Just now';
    return `${diffMins}m ago`;
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  };

  return (
    <AdminLayout>
      <div 
        className={cn(
          "flex flex-col max-w-full overflow-hidden",
          // Mobile: stretch to fill entire remaining viewport below admin header, edge-to-edge
          isMobile 
            ? "fixed inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-20" 
            : "h-[calc(100dvh-5rem)] -m-6 lg:-m-8 relative"
        )}
        style={{ 
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Card className="flex-1 flex flex-col overflow-hidden rounded-none md:rounded-lg md:m-4 lg:m-6 bg-background border-0 md:border">
          <CardHeader className="border-b border-border shrink-0 px-3 py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">Staff Chat</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground shrink-0">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                <span>{onlineUsers.length} online</span>
              </div>
            </CardTitle>
            {/* Staff panel - shows online and last seen */}
            {allStaff && allStaff.length > 0 && (
              <ScrollArea className="max-h-24 mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {/* Online users first */}
                  {onlineUsers.map((staff) => (
                    <div
                      key={staff.user_id}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs shrink-0",
                        staff.user_id === user?.id
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Circle className={cn(
                        "h-1.5 w-1.5 shrink-0",
                        staff.typing
                          ? "fill-yellow-500 text-yellow-500 animate-pulse"
                          : "fill-green-500 text-green-500"
                      )} />
                      <span className="truncate max-w-[60px]">
                        {staff.user_id === user?.id ? 'You' : staff.name}
                      </span>
                      {staff.typing && staff.user_id !== user?.id && (
                        <span className="text-[10px] text-muted-foreground">typing</span>
                      )}
                    </div>
                  ))}
                  {/* Offline users with last seen - sorted by most recently active */}
                  {allStaff
                    .filter(staff => !onlineUsers.some(o => o.user_id === staff.user_id))
                    .sort((a, b) => {
                      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
                      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
                      return bTime - aTime; // Most recent first
                    })
                    .map((staff) => {
                      const lastSeenText = staff.last_seen ? formatLastSeen(staff.last_seen) : 'Never';
                      const isOffline = lastSeenText === 'Offline' || lastSeenText === 'Never';
                      
                      return (
                        <div
                          key={staff.user_id}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-opacity shrink-0",
                            isOffline 
                              ? "bg-muted/30 text-muted-foreground/50 opacity-60" 
                              : "bg-muted/50 text-muted-foreground"
                          )}
                          title={`Last seen: ${lastSeenText}`}
                        >
                          <Circle className={cn(
                            "h-1.5 w-1.5 shrink-0",
                            isOffline
                              ? "fill-muted-foreground/20 text-muted-foreground/20"
                              : "fill-amber-500/70 text-amber-500/70"
                          )} />
                          <span className={cn(
                            "truncate max-w-[50px]",
                            isOffline && "opacity-70"
                          )}>
                            {staff.display_name || 'Staff Member'}
                          </span>
                          <span className={cn(
                            "text-[10px]",
                            isOffline ? "opacity-50" : "opacity-80"
                          )}>{lastSeenText}</span>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading messages...</p>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                  <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages?.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                    const profile = profiles?.[msg.sender_id];
                    const isOptimistic = msg.id.startsWith('optimistic-');
                    const isSending = isOptimistic && sendMessageMutation.isPending;
                    
                    // Get read receipts for this message (only show for own messages)
                    const reads = messageReads?.[msg.id] || [];
                    const othersWhoRead = reads.filter(r => r.user_id !== user?.id);
                    const hasBeenRead = othersWhoRead.length > 0;
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          isOwn && "flex-row-reverse",
                          isOptimistic && "opacity-70"
                        )}
                      >
                        {showAvatar ? (
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/20">
                              {getInitials(profile)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-7 shrink-0" />
                        )}
                        <div className={cn(
                          "flex flex-col min-w-0 max-w-[75%]",
                          isOwn && "items-end"
                        )}>
                          {showAvatar && (
                            <span className="text-xs text-muted-foreground mb-0.5">
                              {isOwn ? 'You' : getName(msg.sender_id)}
                            </span>
                          )}
                          <div className={cn(
                            "rounded-2xl px-3 py-2",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted rounded-tl-sm"
                          )}>
                            <p className="text-sm whitespace-pre-wrap break-words">{renderMessage(msg.message, isOwn)}</p>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(msg.created_at)}
                            </span>
                            {isSending && (
                              <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                            )}
                            {/* Read receipts - only show for own messages */}
                            {isOwn && !isOptimistic && (
                              <div className="flex items-center" title={hasBeenRead ? `Read by ${othersWhoRead.length} staff` : 'Sent'}>
                                {hasBeenRead ? (
                                  <CheckCheck className="h-3 w-3 text-primary" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-3 py-1.5 border-t border-border/50 shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="truncate">{getTypingText()}</span>
                </div>
              </div>
            )}

            {/* Input */}
            <div
              className={cn(
                "border-t border-border shrink-0 relative",
                isMobile
                  ? "px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                  : "p-3"
              )}
            >
              {/* Mention suggestions dropdown */}
              {showMentionSuggestions && totalSuggestions > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-w-full">
                  <div className="p-1 max-h-40 overflow-y-auto">
                    <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
                      <AtSign className="h-3 w-3 shrink-0" />
                      Mention someone
                    </div>
                    
                    {/* Group mentions */}
                    {filteredGroupMentions.map((group, index) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => insertGroupMention(group.name)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                          index === mentionIndex ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="h-5 w-5 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                          <Users className="h-3 w-3 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-destructive">@{group.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{group.description}</p>
                        </div>
                      </button>
                    ))}
                    
                    {/* Divider if both groups and staff exist */}
                    {filteredGroupMentions.length > 0 && filteredStaff.length > 0 && (
                      <div className="border-t border-border my-1" />
                    )}
                    
                    {/* Individual staff members */}
                    {filteredStaff.slice(0, 6).map((staff, index) => {
                      const actualIndex = filteredGroupMentions.length + index;
                      return (
                        <button
                          key={staff.user_id}
                          type="button"
                          onClick={() => insertMention(staff)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                            actualIndex === mentionIndex ? "bg-accent" : "hover:bg-accent/50"
                          )}
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary/20">
                              {getInitials(staff)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {staff.display_name || 'Staff Member'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSend}>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Message... @ to mention"
                    className="flex-1 h-9 text-sm"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}