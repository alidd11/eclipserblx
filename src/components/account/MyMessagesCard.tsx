import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, Send, Loader2, MessageCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

interface MessageReply {
  id: string;
  reply_content: string;
  sender_type: string;
  sent_at: string;
  sent_by: string;
}

export function MyMessagesCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});

  // Fetch user's contact messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['my-contact-messages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const { data, error } = await supabase
        .from('contact_messages')
        .select('id, subject, message, status, created_at, responded_at')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContactMessage[];
    },
    enabled: !!user?.email,
  });

  // Fetch replies for expanded message
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['message-replies', expandedMessage],
    queryFn: async () => {
      if (!expandedMessage) return [];
      const { data, error } = await supabase
        .from('contact_message_replies')
        .select('id, reply_content, sender_type, sent_at, sent_by')
        .eq('contact_message_id', expandedMessage)
        .order('sent_at', { ascending: true });
      
      if (error) throw error;
      return data as MessageReply[];
    },
    enabled: !!expandedMessage,
  });

  // Real-time subscription for new replies
  useEffect(() => {
    if (!user?.email) return;

    const channel = supabase
      .channel('customer-message-replies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_message_replies',
        },
        async (payload) => {
          // Check if this reply is for one of the user's messages
          const { data: msg } = await supabase
            .from('contact_messages')
            .select('email')
            .eq('id', payload.new.contact_message_id)
            .single();
          
          if (msg?.email === user.email && payload.new.sender_type === 'staff') {
            // Staff replied - show notification
            toast.success('New reply from support!', {
              description: 'Staff has responded to your message.',
            });
            
            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['my-contact-messages'] });
            queryClient.invalidateQueries({ queryKey: ['message-replies', payload.new.contact_message_id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, queryClient]);

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Insert the reply
      const { error: replyError } = await supabase
        .from('contact_message_replies')
        .insert({
          contact_message_id: messageId,
          reply_content: content,
          sent_by: user.id,
          sender_type: 'customer',
          sent_at: new Date().toISOString(),
        });
      
      if (replyError) throw replyError;

      // Update message status back to pending
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({ status: 'pending' })
        .eq('id', messageId);
      
      if (updateError) throw updateError;
    },
    onSuccess: (_, { messageId }) => {
      toast.success('Reply sent successfully');
      setReplyContent(prev => ({ ...prev, [messageId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['my-contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-replies', messageId] });
    },
    onError: (error) => {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      new: { label: 'Awaiting Response', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
      pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
      responded: { label: 'Responded', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
    };
    const config = statusConfig[status] || statusConfig.new;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleSendReply = (messageId: string) => {
    const content = replyContent[messageId]?.trim();
    if (!content) return;
    sendReplyMutation.mutate({ messageId, content });
  };

  if (!user) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          My Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading messages...</p>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No contact messages yet.</p>
            <p className="text-sm mt-1">Messages you send via the contact form will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-lg border bg-muted/30 overflow-hidden">
                {/* Message Header - Clickable */}
                <button
                  onClick={() => setExpandedMessage(expandedMessage === msg.id ? null : msg.id)}
                  className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(msg.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(msg.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="font-medium truncate">{msg.subject}</p>
                    </div>
                    {expandedMessage === msg.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedMessage === msg.id && (
                  <div className="border-t p-4 space-y-4">
                    {/* Original Message */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Your original message:</p>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    {/* Conversation Thread */}
                    {repliesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : replies && replies.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground font-medium">Conversation:</p>
                        {replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`p-3 rounded-lg ${
                              reply.sender_type === 'staff'
                                ? 'bg-primary/10 border border-primary/20 ml-4'
                                : 'bg-muted/50 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-medium">
                                {reply.sender_type === 'staff' ? 'Eclipse Support' : 'You'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(reply.sent_at), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{reply.reply_content}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Reply Form */}
                    <div className="space-y-2 pt-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyContent[msg.id] || ''}
                        onChange={(e) => setReplyContent(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        rows={3}
                        className="resize-none"
                      />
                      <Button
                        onClick={() => handleSendReply(msg.id)}
                        disabled={!replyContent[msg.id]?.trim() || sendReplyMutation.isPending}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        {sendReplyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
