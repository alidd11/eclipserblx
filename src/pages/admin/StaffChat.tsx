import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Crown, Shield, Wrench, Briefcase, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Badge configuration for user roles
const roleBadges: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  admin: { 
    label: 'Admin', 
    icon: Crown, 
    className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' 
  },
  product_manager: { 
    label: 'Products', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  order_manager: { 
    label: 'Orders', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  support_agent: { 
    label: 'Support', 
    icon: Wrench, 
    className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30' 
  },
  analyst: { 
    label: 'Analyst', 
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

interface TypingUser {
  id: string;
  name: string;
}

function StaffChatContent() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    queryKey: ['staff-chat-profiles', messages.map(m => m.user_id)],
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
    queryKey: ['staff-chat-roles', messages.map(m => m.user_id)],
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
        .from('staff_chat_messages')
        .insert({ user_id: user.id, message });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
      setNewMessage('');
    },
    onError: () => {
      showErrorNotification('Error', 'Failed to send message');
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('staff_chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
      showSuccessNotification('Deleted', 'Message removed');
    },
    onError: () => {
      showErrorNotification('Error', 'Could not delete message');
    },
  });

  // Real-time subscription for messages and typing
  useEffect(() => {
    const channel = supabase
      .channel('staff-chat-presence', {
        config: { presence: { key: user?.id || 'anonymous' } }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-chat-messages'] });
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

    const channel = supabase.channel('staff-chat-presence');
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
    
    const channel = supabase.channel('staff-chat-presence');
    channel.track({ typing: false, name: currentProfile?.display_name || 'User' });
    
    sendMutation.mutate(newMessage.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const getUserBadge = (userId: string) => {
    const roles = userRoles[userId] || [];
    if (roles.includes('admin')) return roleBadges.admin;
    if (roles.includes('recruiter')) return roleBadges.recruiter;
    if (roles.includes('support_agent')) return roleBadges.support_agent;
    if (roles.includes('product_manager')) return roleBadges.product_manager;
    if (roles.includes('order_manager')) return roleBadges.order_manager;
    if (roles.includes('analyst')) return roleBadges.analyst;
    return null;
  };

  const canDeleteMessage = (msgUserId: string) => {
    return isAdmin || user?.id === msgUserId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Chat</h1>
        <p className="text-muted-foreground">Real-time team communication</p>
      </div>

      <div className="flex flex-col h-[calc(100vh-220px)] bg-card rounded-xl border border-border overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const profile = profiles[msg.user_id];
                const authorName = profile?.display_name || 'Anonymous';
                const badge = getUserBadge(msg.user_id);
                const isOwn = user?.id === msg.user_id;

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 group",
                      isOwn && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={authorName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-display font-bold text-xs">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Message content */}
                    <div className={cn("max-w-[70%] flex flex-col", isOwn && "items-end")}>
                      <div className={cn("flex items-center gap-2 mb-1 flex-wrap", isOwn && "flex-row-reverse")}>
                        {badge && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0 h-4 font-medium border", badge.className)}
                          >
                            <badge.icon className="h-2.5 w-2.5 mr-0.5" />
                            {badge.label}
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-foreground">{authorName}</span>
                        
                        {/* Delete button */}
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
                        
                        {/* Timestamp */}
                        <span className={cn(
                          "text-[10px] text-muted-foreground mt-0.5 block",
                          isOwn && "text-right"
                        )}>
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/50">
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sendMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function StaffChat() {
  return (
    <AdminLayout>
      <StaffChatContent />
    </AdminLayout>
  );
}
