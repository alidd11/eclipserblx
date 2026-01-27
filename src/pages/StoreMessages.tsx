import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Store, MessageCircle, Loader2, ArrowLeft, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
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
  store?: {
    id: string;
    name: string;
    logo_url: string | null;
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

interface PurchasedStore {
  store_id: string;
  store_name: string;
  logo_url: string | null;
  orders: Array<{
    order_id: string;
    order_date: string;
    product_names: string[];
  }>;
}

export default function StoreMessages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedStore, setSelectedStore] = useState<PurchasedStore | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [directStore, setDirectStore] = useState<{ id: string; name: string; logo_url: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for direct store parameter from URL
  const directStoreId = searchParams.get('store');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Fetch direct store info if store param is provided
  const { data: directStoreData } = useQuery({
    queryKey: ['direct-store', directStoreId],
    queryFn: async () => {
      if (!directStoreId) return null;
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, logo_url')
        .eq('id', directStoreId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!directStoreId && !!user,
  });

  // Auto-show new conversation when direct store is loaded
  useEffect(() => {
    if (directStoreData && !directStore) {
      setDirectStore(directStoreData);
      setShowNewConversation(true);
    }
  }, [directStoreData, directStore]);

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['store-conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('store_conversations')
        .select(`
          *,
          store:stores(id, name, logo_url)
        `)
        .eq('customer_id', user.id)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      
      // Get unread counts
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('store_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'seller')
            .eq('is_read', false);
          
          return { ...conv, unread_count: count || 0 };
        })
      );
      
      return conversationsWithUnread as StoreConversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['store-messages', selectedConversation],
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

  // Fetch stores the user has purchased from
  const { data: purchasedStores = [] } = useQuery({
    queryKey: ['purchased-stores', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          order_items(
            product_name,
            product:products(
              store_id,
              store:stores(id, name, logo_url)
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by store, keeping all orders
      const storeMap = new Map<string, PurchasedStore>();
      
      (data || []).forEach((order) => {
        order.order_items?.forEach((item: any) => {
          const store = item.product?.store;
          if (!store) return;
          
          if (!storeMap.has(store.id)) {
            storeMap.set(store.id, {
              store_id: store.id,
              store_name: store.name,
              logo_url: store.logo_url,
              orders: [{
                order_id: order.id,
                order_date: order.created_at,
                product_names: [item.product_name],
              }],
            });
          } else {
            const existing = storeMap.get(store.id)!;
            const existingOrder = existing.orders.find(o => o.order_id === order.id);
            if (existingOrder) {
              if (!existingOrder.product_names.includes(item.product_name)) {
                existingOrder.product_names.push(item.product_name);
              }
            } else {
              existing.orders.push({
                order_id: order.id,
                order_date: order.created_at,
                product_names: [item.product_name],
              });
            }
          }
        });
      });
      
      return Array.from(storeMap.values());
    },
    enabled: !!user && showNewConversation,
  });

  // Mark messages as read
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.sender_type === 'seller' && !m.is_read);
      if (unreadMessages.length > 0) {
        supabase
          .from('store_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['store-conversations'] });
          });
      }
    }
  }, [selectedConversation, messages, queryClient]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('store-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['store-messages'] });
          queryClient.invalidateQueries({ queryKey: ['store-conversations'] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ storeId, orderId, subject, initialMessage }: { storeId: string; orderId: string | null; subject: string; initialMessage: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('store_conversations')
        .insert({
          store_id: storeId,
          customer_id: user.id,
          order_id: orderId,
          subject: subject || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Send initial message with the issue description
      if (initialMessage.trim()) {
        await supabase.from('store_messages').insert({
          conversation_id: data.id,
          store_id: storeId,
          customer_id: user.id,
          sender_type: 'customer',
          message: initialMessage.trim(),
        });
        
        // Update last_message_at
        await supabase
          .from('store_conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', data.id);
      }
      
      return data;
    },
    onSuccess: (data) => {
      setSelectedConversation(data.id);
      setShowNewConversation(false);
      setNewSubject('');
      setIssueDescription('');
      setSelectedStore(null);
      setSelectedOrderId(null);
      setDirectStore(null);
      // Clear the store query param
      searchParams.delete('store');
      setSearchParams(searchParams);
      queryClient.invalidateQueries({ queryKey: ['store-conversations'] });
      toast.success('Conversation started');
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');
      
      const { error } = await supabase.from('store_messages').insert({
        conversation_id: conversationId,
        store_id: conversation.store_id,
        customer_id: user.id,
        sender_type: 'customer',
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
      queryClient.invalidateQueries({ queryKey: ['store-messages'] });
      queryClient.invalidateQueries({ queryKey: ['store-conversations'] });
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

  const handleStartConversation = () => {
    // Build subject from issue description if no subject provided
    const finalSubject = newSubject.trim() || (issueDescription.trim() ? issueDescription.trim().slice(0, 100) : '');
    
    // Handle direct store messaging (from store page)
    if (directStore) {
      createConversationMutation.mutate({
        storeId: directStore.id,
        orderId: selectedOrderId,
        subject: finalSubject,
        initialMessage: issueDescription.trim(),
      });
      return;
    }
    // Handle purchased store messaging
    if (!selectedStore) return;
    createConversationMutation.mutate({
      storeId: selectedStore.store_id,
      orderId: selectedOrderId,
      subject: finalSubject,
      initialMessage: issueDescription.trim(),
    });
  };
  
  // Get all product names for a store (for display)
  const getStoreProductNames = (store: PurchasedStore) => {
    const allProducts = store.orders.flatMap(o => o.product_names);
    const uniqueProducts = [...new Set(allProducts)];
    return uniqueProducts;
  };

  if (!user) return null;

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <EclipseLogo size="sm" />
            <h1 className="text-lg font-semibold">Store Messages</h1>
          </div>
          {!showNewConversation && !selectedConversation && (
            <Button size="sm" onClick={() => setShowNewConversation(true)}>
              <MessageCircle className="h-4 w-4 mr-1.5" />
              New Message
            </Button>
          )}
        </div>

        {/* New Conversation View */}
        {showNewConversation && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Contact a Store</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowNewConversation(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Direct store contact (from store page) */}
            {directStore ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/10">
                  {directStore.logo_url ? (
                    <img src={directStore.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Store className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{directStore.name}</p>
                    <p className="text-xs text-muted-foreground">Direct message</p>
                  </div>
                </div>
                
                {/* Order Selection - Show if user has orders from this store */}
                {purchasedStores.find(s => s.store_id === directStore.id) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select an order (optional)</label>
                    <select
                      value={selectedOrderId || ''}
                      onChange={(e) => setSelectedOrderId(e.target.value || null)}
                      className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">General inquiry (no specific order)</option>
                      {purchasedStores.find(s => s.store_id === directStore.id)?.orders.map((order) => (
                        <option key={order.order_id} value={order.order_id}>
                          {format(new Date(order.order_date), 'MMM d, yyyy')} - {order.product_names.slice(0, 2).join(', ')}
                          {order.product_names.length > 2 ? ` +${order.product_names.length - 2}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Issue Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Describe your issue</label>
                  <textarea
                    placeholder="Please describe what you need help with..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={4}
                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                
                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject (optional)</label>
                  <Input
                    placeholder="Brief summary of your issue"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleStartConversation}
                  disabled={createConversationMutation.isPending || !issueDescription.trim()}
                >
                  {createConversationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4 mr-2" />
                  )}
                  Start Conversation
                </Button>
              </div>
            ) : purchasedStores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>You haven't purchased from any stores yet.</p>
                <p className="text-sm mt-1">Buy a product to contact its seller.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select a store</label>
                  <div className="grid gap-2">
                    {purchasedStores.map((store) => {
                      const productNames = getStoreProductNames(store);
                      return (
                        <button
                          key={store.store_id}
                          onClick={() => {
                            setSelectedStore(store);
                            setSelectedOrderId(null);
                          }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                            selectedStore?.store_id === store.store_id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          {store.logo_url ? (
                            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Store className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{store.store_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {store.orders.length} order{store.orders.length !== 1 ? 's' : ''} • {productNames.slice(0, 2).join(', ')}
                              {productNames.length > 2 && ` +${productNames.length - 2} more`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {selectedStore && (
                  <>
                    {/* Order Selection Dropdown */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select an order (optional)</label>
                      <select
                        value={selectedOrderId || ''}
                        onChange={(e) => setSelectedOrderId(e.target.value || null)}
                        className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">General inquiry (no specific order)</option>
                        {selectedStore.orders.map((order) => (
                          <option key={order.order_id} value={order.order_id}>
                            {format(new Date(order.order_date), 'MMM d, yyyy')} - {order.product_names.slice(0, 2).join(', ')}
                            {order.product_names.length > 2 ? ` +${order.product_names.length - 2}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Issue Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Describe your issue</label>
                      <textarea
                        placeholder="Please describe what you need help with..."
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        rows={4}
                        className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                      />
                    </div>
                    
                    {/* Subject (optional) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject (optional)</label>
                      <Input
                        placeholder="Brief summary of your issue"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleStartConversation}
                      disabled={createConversationMutation.isPending || !issueDescription.trim()}
                    >
                      {createConversationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-2" />
                      )}
                      Start Conversation
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Conversation View */}
        {selectedConversation && selectedConv && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Conversation Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Button variant="ghost" size="icon" onClick={() => {
                setSelectedConversation(null);
                setSearchParams({});
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {selectedConv.store?.logo_url ? (
                <img src={selectedConv.store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedConv.store?.name || 'Store'}</p>
                {selectedConv.subject && (
                  <p className="text-xs text-muted-foreground truncate">{selectedConv.subject}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex',
                        msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2',
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={cn(
                          'text-[10px] mt-1',
                          msg.sender_type === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                          {format(new Date(msg.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
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
        )}

        {/* Conversations List */}
        {!showNewConversation && !selectedConversation && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Store className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No store conversations</p>
                <p className="text-sm mt-1">Contact stores you've purchased from.</p>
              </div>
            ) : (
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
                    {conv.store?.logo_url ? (
                      <img src={conv.store.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <Store className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{conv.store?.name || 'Store'}</p>
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
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
