import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, User, MessageCircle, Loader2, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useIOSKeyboardFix } from '@/hooks/useIOSKeyboardFix';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hapticTap } from '@/lib/haptics';
import { toast } from 'sonner';

interface StoreConversation {
  id: string;
  store_id: string;
  customer_id: string;
  order_id: string | null;
  subject: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
  customer_profile?: {
    customer_id: string | null;
    display_name: string | null;
    username: string;
  };
  unread_count?: number;
}

interface StoreMessage {
  id: string;
  conversation_id: string;
  store_id: string;
  customer_id: string;
  sender_type: 'customer' | 'seller';
  message: string;
  is_read: boolean;
  created_at: string;
}

const CONVERSATIONS_PER_PAGE = 10;

export default function SellerMessages() {
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();
  const { isKeyboardVisible } = useIOSKeyboardFix();
  const storeId = store?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (!isSeller) {
      navigate('/seller');
    }
  }, [user, isSeller, navigate]);

  // Fetch conversations for this store with pagination and batched profile fetching
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['seller-store-conversations', storeId, currentPage],
    queryFn: async () => {
      if (!storeId) return { conversations: [], totalCount: 0 };
      
      const from = (currentPage - 1) * CONVERSATIONS_PER_PAGE;
      const to = from + CONVERSATIONS_PER_PAGE - 1;
      
      const { data, count, error } = await supabase
        .from('store_conversations')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order('last_message_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      if (!data || data.length === 0) return { conversations: [], totalCount: count || 0 };
      
      // Batch fetch customer profiles using .in() instead of individual queries
      const customerIds = [...new Set(data.map(conv => conv.customer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, customer_id, display_name, username')
        .in('user_id', customerIds);
      
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { customer_id: p.customer_id, display_name: p.display_name, username: p.username }])
      );
      
      // Batch fetch unread counts
      const conversationIds = data.map(conv => conv.id);
      const { data: unreadData } = await supabase
        .from('store_messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('sender_type', 'customer')
        .eq('is_read', false);
      
      const unreadCounts = new Map<string, number>();
      (unreadData || []).forEach(msg => {
        unreadCounts.set(msg.conversation_id, (unreadCounts.get(msg.conversation_id) || 0) + 1);
      });
      
      const conversationsWithData = data.map(conv => ({
        ...conv,
        customer_profile: profileMap.get(conv.customer_id) || { customer_id: null, display_name: null, username: 'Unknown' },
        unread_count: unreadCounts.get(conv.id) || 0,
      }));
      
      return { conversations: conversationsWithData as StoreConversation[], totalCount: count || 0 };
    },
    enabled: !!storeId,
    staleTime: 30000,
  });

  const conversations = conversationsData?.conversations || [];
  const totalCount = conversationsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / CONVERSATIONS_PER_PAGE);

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['seller-store-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('store_messages')
        .select('*')
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as StoreMessage[];
    },
    enabled: !!selectedConversation,
  });

  // Mark messages as read
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.sender_type === 'customer' && !m.is_read);
      if (unreadMessages.length > 0) {
        supabase
          .from('store_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['seller-store-conversations'] });
          });
      }
    }
  }, [selectedConversation, messages, queryClient]);

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    
    const channel = supabase
      .channel('seller-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_messages',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seller-store-messages'] });
          queryClient.invalidateQueries({ queryKey: ['seller-store-conversations'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to bottom when keyboard opens on iOS
  useEffect(() => {
    if (isKeyboardVisible && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [isKeyboardVisible]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      if (!user || !storeId) throw new Error('Not authenticated');
      
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');
      
      const { error } = await supabase.from('store_messages').insert({
        conversation_id: conversationId,
        store_id: storeId,
        customer_id: conversation.customer_id,
        sender_type: 'seller',
        message,
      });
      
      if (error) throw error;
      
      // Update last_message_at
      await supabase
        .from('store_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setNewMessage('');
      hapticTap();
      queryClient.invalidateQueries({ queryKey: ['seller-store-messages'] });
      queryClient.invalidateQueries({ queryKey: ['seller-store-conversations'] });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    },
  });

  const handleSend = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({ conversationId: selectedConversation, message: newMessage.trim() });
  };

  if (!user || !isSeller) return null;

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const getCustomerDisplayName = (conv: StoreConversation) => {
    const profile = conv.customer_profile;
    if (profile?.display_name) return profile.display_name;
    if (profile?.username) return profile.username;
    return 'Customer';
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Customer Messages</h1>
          <p className="text-muted-foreground">Respond to customer inquiries</p>
        </div>

        {/* Privacy Notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-500">Privacy Notice</p>
            <p className="text-muted-foreground mt-1">
              For customer privacy, you can only see the customer's ID, display name, and username. 
              No email addresses or other personal information is shared.
            </p>
          </div>
        </div>

        {/* Conversation View */}
        {selectedConversation && selectedConv ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Conversation Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => {
                setSelectedConversation(null);
                setSearchParams({});
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{getCustomerDisplayName(selectedConv)}</p>
                  {selectedConv.customer_profile?.customer_id && (
                    <Badge variant="outline" className="text-xs">
                      {selectedConv.customer_profile.customer_id}
                    </Badge>
                  )}
                </div>
                {selectedConv.subject && (
                  <p className="text-xs text-muted-foreground truncate">{selectedConv.subject}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-[min(400px,50dvh)] overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p>No messages in this conversation.</p>
                </div>
              ) : (
                <div>
                  {messages.map((msg, index) => {
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isGrouped = prevMsg && prevMsg.sender_type === msg.sender_type;
                    return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.sender_type === 'seller' ? 'justify-end' : 'justify-start',
                        isGrouped ? 'mt-0.5' : index > 0 ? 'mt-4' : ''
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2',
                          msg.sender_type === 'seller'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={cn(
                          'text-[10px] mt-1',
                          msg.sender_type === 'seller' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background/50">
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="rounded-full"
                  />
                </div>
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Conversations List */
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No customer messages</p>
                <p className="text-sm mt-1">Customer inquiries will appear here.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv.id);
                        setSearchParams({ conversation: conv.id });
                      }}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-medium truncate">{getCustomerDisplayName(conv)}</p>
                            {conv.customer_profile?.customer_id && (
                              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                {conv.customer_profile.customer_id}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                          </span>
                        </div>
                        {conv.subject && (
                          <p className="text-sm text-muted-foreground truncate">{conv.subject}</p>
                        )}
                      </div>
                      {(conv.unread_count || 0) > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                          {conv.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
