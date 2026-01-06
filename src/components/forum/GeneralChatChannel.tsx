import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Crown, Shield, Wrench, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export function GeneralChatChannel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('forum-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_chat_messages'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['forum-chat-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    sendMutation.mutate(newMessage.trim());
  };

  const getUserBadge = (userId: string) => {
    const roles = userRoles[userId] || [];
    if (roles.includes('admin')) return roleBadges.admin;
    if (roles.includes('recruiter')) return roleBadges.recruiter;
    if (roles.includes('support_agent')) return roleBadges.support_agent;
    if (roles.some(r => ['product_manager', 'order_manager', 'analyst'].includes(r))) return roleBadges.product_manager;
    return null;
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

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
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
                    </div>
                    <div className={cn(
                      "px-3 py-2 rounded-xl text-sm",
                      isOwn 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-muted rounded-bl-sm"
                    )}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-border/50">
        {user ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
