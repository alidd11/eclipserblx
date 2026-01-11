import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, Users, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
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
const renderMessageWithMentions = (message: string) => {
  const parts = message.split(/(@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium bg-primary/10 rounded px-1">
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
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
  const { data: allStaff = [] } = useQuery({
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
    mutationFn: async (message: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('staff_chat_messages')
        .insert({
          user_id: user.id,
          message: message.trim(),
        });
      
      if (error) throw error;

      // Send notifications to mentioned users
      await sendMentionNotifications(message.trim(), user.id);
    },
    onSuccess: () => {
      setNewMessage('');
      setShowMentionSuggestions(false);
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
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
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
    },
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Real-time subscription
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
    const cursorPos = e.target.selectionStart || 0;
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
    const cursorPos = inputRef.current?.selectionStart || newMessage.length;
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

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Messages</h1>
          <p className="text-muted-foreground">Real-time communication with your team • Use @mentions to notify</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">Team Chat</span>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea ref={scrollRef} className="h-[500px] px-4">
            <div className="space-y-4 py-4">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.user_id === user?.id;
                  const role = userRoles[message.user_id];
                  const roleBadge = role ? roleBadges[role] : null;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3 group',
                        isOwn && 'flex-row-reverse'
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {getInitials(message.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {getDisplayName(message.user_id)}
                          </span>
                          {roleBadge && (
                            <Badge variant="outline" className={cn('text-xs py-0', roleBadge.className)}>
                              {roleBadge.label}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm',
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          {renderMessageWithMentions(message.message)}
                        </div>
                        {canDeleteMessage(message.user_id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                            onClick={() => deleteMessageMutation.mutate(message.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}

          {/* Message input with mention suggestions */}
          <div className="p-4 border-t border-border/50 relative">
            {/* Mention suggestions dropdown */}
            {showMentionSuggestions && allSuggestions.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                {allSuggestions.map((suggestion, index) => (
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
                          <div className="font-medium text-sm">
                            @{getMentionHandle(suggestion)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.display_name || suggestion.email.split('@')[0]}
                          </div>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... Use @ to mention"
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
