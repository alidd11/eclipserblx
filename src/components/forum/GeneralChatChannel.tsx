import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Crown, Shield, Wrench, Briefcase, Trash2, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// Badge configuration for user roles
const roleBadges: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  admin: { 
    label: 'Admin', 
    icon: Crown, 
    className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' 
  },
  product_manager: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  order_manager: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  support_agent: { 
    label: 'Support', 
    icon: Wrench, 
    className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30' 
  },
  analyst: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  recruiter: { 
    label: 'Recruiter', 
    icon: Briefcase, 
    className: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30' 
  },
};

// Available reaction emojis
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'];

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface TypingUser {
  id: string;
  name: string;
}

export function GeneralChatChannel() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [openReactionPopover, setOpenReactionPopover] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Fetch current user's profile for typing indicator
  const { data: currentProfile } = useQuery({
    queryKey: ['current-user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['forum-chat-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return data as ChatMessage[];
    },
  });

  // Fetch reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ['forum-chat-reactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_chat_reactions')
        .select('*');
      
      if (error) throw error;
      return data as ChatReaction[];
    },
  });

  // Fetch user profiles
  const { data: profiles = {} } = useQuery({
    queryKey: ['forum-chat-profiles', messages.map(m => m.user_id)],
    queryFn: async () => {
      if (!messages.length) return {};
      
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      data.forEach(p => {
        map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: messages.length > 0,
  });

  // Fetch user roles
  const { data: userRoles = {} } = useQuery({
    queryKey: ['forum-chat-roles', messages.map(m => m.user_id)],
    queryFn: async () => {
      if (!messages.length) return {};
      
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const map: Record<string, string[]> = {};
      data.forEach(r => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
    enabled: messages.length > 0,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('forum_chat_messages')
        .insert({ user_id: user.id, message });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-chat-messages'] });
      setNewMessage('');
    },
  });

  // Delete message mutation (admin only)
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('forum_chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-chat-messages'] });
      toast.success('Message deleted');
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('forum_chat_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-chat-reactions'] });
      setOpenReactionPopover(null);
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('forum_chat_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-chat-reactions'] });
    },
  });

  // Real-time subscription for messages, reactions, and typing
  useEffect(() => {
    const channel = supabase
      .channel('forum-chat-presence', {
        config: { presence: { key: user?.id || 'anonymous' } }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['forum-chat-messages'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_chat_reactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['forum-chat-reactions'] });
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing: TypingUser[] = [];
        
        Object.entries(state).forEach(([userId, presences]) => {
          if (userId !== user?.id && Array.isArray(presences)) {
            const presence = presences[0] as { typing?: boolean; name?: string };
            if (presence?.typing) {
              typing.push({ id: userId, name: presence.name || 'Someone' });
            }
          }
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({ typing: false, name: currentProfile?.display_name || 'User' });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user, currentProfile?.display_name]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!user) return;
    
    const now = Date.now();
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    const channel = supabase.channel('forum-chat-presence');
    channel.track({ typing: true, name: currentProfile?.display_name || 'User' });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, name: currentProfile?.display_name || 'User' });
    }, 2000);
  }, [user, currentProfile?.display_name]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    const channel = supabase.channel('forum-chat-presence');
    channel.track({ typing: false, name: currentProfile?.display_name || 'User' });
    
    sendMutation.mutate(newMessage.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    if (!user) return;
    
    const existingReaction = reactions.find(
      r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
    );
    
    if (existingReaction) {
      removeReactionMutation.mutate({ messageId, emoji });
    } else {
      addReactionMutation.mutate({ messageId, emoji });
    }
  };

  const getMessageReactions = (messageId: string) => {
    const messageReactions = reactions.filter(r => r.message_id === messageId);
    const grouped: Record<string, { count: number; userReacted: boolean }> = {};
    
    messageReactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, userReacted: false };
      }
      grouped[r.emoji].count++;
      if (user && r.user_id === user.id) {
        grouped[r.emoji].userReacted = true;
      }
    });
    
    return grouped;
  };

  const getUserBadge = (userId: string) => {
    const roles = userRoles[userId] || [];
    if (roles.includes('admin')) return roleBadges.admin;
    if (roles.includes('recruiter')) return roleBadges.recruiter;
    if (roles.includes('support_agent')) return roleBadges.support_agent;
    if (roles.some(r => ['product_manager', 'order_manager', 'analyst'].includes(r))) return roleBadges.product_manager;
    return null;
  };

  const canDeleteMessage = (msgUserId: string) => {
    return isAdmin || user?.id === msgUserId;
  };

  return (
    <div className="flex flex-col h-[600px] bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Be the first to say something!
            </div>
          ) : (
            messages.map((msg) => {
              const profile = profiles[msg.user_id];
              const authorName = profile?.display_name || 'Anonymous';
              const badge = getUserBadge(msg.user_id);
              const isOwn = user?.id === msg.user_id;
              const messageReactions = getMessageReactions(msg.id);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 group",
                    isOwn && "flex-row-reverse"
                  )}
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                    <span className="text-white font-display font-bold text-xs">
                      {authorName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Message content */}
                  <div className={cn("max-w-[70%]", isOwn && "items-end")}>
                    <div className={cn("flex items-center gap-2 mb-1", isOwn && "flex-row-reverse")}>
                      <span className="text-sm font-medium text-foreground">{authorName}</span>
                      {badge && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 py-0 h-4 font-medium border", badge.className)}
                        >
                          <badge.icon className="h-2.5 w-2.5 mr-0.5" />
                          {badge.label}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      
                      {/* Delete button for admins/own messages */}
                      {canDeleteMessage(msg.user_id) && (
                        <button
                          onClick={() => deleteMutation.mutate(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded text-destructive"
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="relative">
                      <div className={cn(
                        "px-3 py-2 rounded-xl text-sm",
                        isOwn 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-muted rounded-bl-sm"
                      )}>
                        {msg.message}
                      </div>
                      
                      {/* Reaction button */}
                      {user && (
                        <Popover 
                          open={openReactionPopover === msg.id} 
                          onOpenChange={(open) => setOpenReactionPopover(open ? msg.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "absolute -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity",
                                "p-1 bg-card border border-border rounded-full shadow-sm hover:bg-muted",
                                isOwn ? "left-0" : "right-0"
                              )}
                              title="Add reaction"
                            >
                              <SmilePlus className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" side="top">
                            <div className="flex gap-1">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReactionClick(msg.id, emoji)}
                                  className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    
                    {/* Reactions display */}
                    {Object.keys(messageReactions).length > 0 && (
                      <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
                        {Object.entries(messageReactions).map(([emoji, data]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReactionClick(msg.id, emoji)}
                            disabled={!user}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                              data.userReacted 
                                ? "bg-primary/20 border-primary/50 text-primary" 
                                : "bg-muted border-border hover:bg-muted/80",
                              !user && "cursor-default"
                            )}
                          >
                            <span>{emoji}</span>
                            <span className="font-medium">{data.count}</span>
                          </button>
                        ))}
                      </div>
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
        <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
          <span className="inline-flex items-center gap-1">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="ml-1">
              {typingUsers.length === 1 
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.map(u => u.name).join(', ')} are typing...`
              }
            </span>
          </span>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-border/50">
        {user ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sendMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="gradient-button"
              disabled={!newMessage.trim() || sendMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-2">
            <a href="/auth" className="text-primary hover:underline">Sign in</a> to join the conversation
          </div>
        )}
      </div>
    </div>
  );
}
