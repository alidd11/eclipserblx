import { useState, useEffect, useRef } from 'react';
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

export default function StaffMessages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const { error } = await supabase
        .from('staff_messages')
        .insert([{
          sender_id: user?.id,
          recipient_id: null,
          subject: 'Staff Chat',
          message,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage('');
      inputRef.current?.focus();
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Real-time subscription
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
        () => {
          queryClient.invalidateQueries({ queryKey: ['staff-chat'] });
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
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
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

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <Card className="glass-card flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b border-border shrink-0">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Staff Chat
              </div>
              <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                <Users className="h-4 w-4" />
                {onlineCount} staff members
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
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
