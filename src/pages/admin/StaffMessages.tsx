import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Users, AtSign } from 'lucide-react';
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

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface StaffProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

interface TypingUser {
  user_id: string;
  name: string;
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

// Parse @mentions from message text
const parseMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
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
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
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
      // Get all users with staff roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id');
      
      if (rolesError) throw rolesError;
      
      const staffIds = [...new Set(roles.map(r => r.user_id))];
      
      const { data: staffProfiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', staffIds);
      
      if (error) throw error;
      return staffProfiles as StaffProfile[];
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

    const userHandle = getMentionHandle(userProfile);
    return mentions.includes(userHandle);
  }, [allStaff]);

  // Send message mutation
  const sendMessageMutation = useMutation({
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
      inputRef.current?.focus();
      // Stop typing indicator when message is sent
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ typing: false });
      }
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    },
  });

  // Get display name for current user
  const getCurrentUserName = useCallback(() => {
    if (!currentUserProfile) return 'Staff';
    return currentUserProfile.display_name || currentUserProfile.email?.split('@')[0] || 'Staff';
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
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ typing: false });
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
        (payload) => {
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
              const senderName = senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Staff';
              
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
          }
          
          queryClient.invalidateQueries({ queryKey: ['staff-chat'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, profiles, playSound, sendNotification, isUserMentioned]);

  // Presence channel for typing indicators
  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel('staff-chat-presence', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id) {
            const presence = (presences as any[])[0];
            if (presence?.typing) {
              typing.push({
                user_id: key,
                name: presence.name || 'Staff',
              });
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ typing: false });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };
  }, [user?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewMessage(value);
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
  const renderMessage = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    const currentUserHandle = currentUserProfile ? getMentionHandle(currentUserProfile) : '';

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentionedHandle = part.slice(1).toLowerCase();
        const isGroupMention = mentionedHandle === 'everyone' || mentionedHandle === 'here';
        const isCurrentUser = !!currentUserHandle && mentionedHandle === currentUserHandle;

        return (
          <span
            key={i}
            className={cn(
              'font-semibold px-1 rounded',
              isGroupMention
                ? 'text-destructive bg-destructive/15'
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
    return profile.email.slice(0, 2).toUpperCase();
  };

  const getName = (senderId: string) => {
    const profile = profiles?.[senderId];
    return profile?.display_name || profile?.email?.split('@')[0] || 'Staff';
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

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] flex flex-col -mx-2 sm:mx-0">
        <Card className="glass-card flex-1 flex flex-col overflow-hidden rounded-none sm:rounded-lg">
          <CardHeader className="border-b border-border shrink-0 px-3 py-3 lg:px-6 lg:py-4">
            <CardTitle className="flex items-center justify-between text-base lg:text-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="truncate">Staff Chat</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs lg:text-sm font-normal text-muted-foreground">
                <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">{onlineCount} staff</span>
                <span className="sm:hidden">{onlineCount}</span>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollRef}>
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading messages...</p>
              ) : messages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages?.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                    const profile = profiles?.[msg.sender_id];
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {showAvatar ? (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/20">
                              {getInitials(profile)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}
                        <div className={cn(
                          "flex flex-col max-w-[70%]",
                          isOwn && "items-end"
                        )}>
                          {showAvatar && (
                            <span className="text-xs text-muted-foreground mb-1">
                              {isOwn ? 'You' : getName(msg.sender_id)}
                            </span>
                          )}
                          <div className={cn(
                            "rounded-2xl px-4 py-2",
                            isOwn 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted rounded-tl-sm"
                          )}>
                            <p className="text-sm whitespace-pre-wrap break-words">{renderMessage(msg.message)}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{getTypingText()}</span>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-2 sm:p-4 border-t border-border shrink-0 relative">
              {/* Mention suggestions dropdown */}
              {showMentionSuggestions && totalSuggestions > 0 && (
                <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-1 max-h-48 overflow-y-auto">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
                      <AtSign className="h-3 w-3" />
                      Mention someone
                    </div>
                    
                    {/* Group mentions */}
                    {filteredGroupMentions.map((group, index) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => insertGroupMention(group.name)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors",
                          index === mentionIndex ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="h-6 w-6 rounded-full bg-destructive/15 flex items-center justify-center">
                          <Users className="h-3.5 w-3.5 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-destructive">@{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                      </button>
                    ))}
                    
                    {/* Divider if both groups and staff exist */}
                    {filteredGroupMentions.length > 0 && filteredStaff.length > 0 && (
                      <div className="border-t border-border my-1" />
                    )}
                    
                    {/* Individual staff members */}
                    {filteredStaff.slice(0, 8).map((staff, index) => {
                      const actualIndex = filteredGroupMentions.length + index;
                      return (
                        <button
                          key={staff.user_id}
                          type="button"
                          onClick={() => insertMention(staff)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-2 rounded text-left transition-colors",
                            actualIndex === mentionIndex ? "bg-accent" : "hover:bg-accent/50"
                          )}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/20">
                              {getInitials(staff)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {staff.display_name || staff.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{staff.email}</p>
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
                    placeholder="Type a message... Use @ to mention"
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
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