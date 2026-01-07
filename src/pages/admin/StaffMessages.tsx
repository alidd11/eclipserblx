import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, Users } from 'lucide-react';
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

export default function StaffMessages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
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
            // Play notification sound
            playSound();
            
            // Send push notification if tab is not focused
            if (document.hidden) {
              const senderProfile = profiles?.[newMsg.sender_id];
              const senderName = senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Staff';
              sendNotification('New Staff Message', {
                body: `${senderName}: ${newMsg.message.substring(0, 100)}`,
                tag: 'staff-chat-message',
              });
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['staff-chat'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, profiles, playSound, sendNotification]);

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
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTyping();
    }
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
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
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
            <form onSubmit={handleSend} className="p-2 sm:p-4 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}