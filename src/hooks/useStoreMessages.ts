import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/useDevice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hapticTap } from '@/lib/haptics';
import { toast } from 'sonner';

export interface StoreConversation {
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

export interface StoreMessage {
  id: string;
  conversation_id: string;
  store_id: string;
  customer_id: string;
  sender_type: 'customer' | 'seller';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PurchasedStore {
  store_id: string;
  store_name: string;
  logo_url: string | null;
  orders: Array<{
    order_id: string;
    order_date: string;
    product_names: string[];
  }>;
}

export function useStoreMessages() {
  const { user } = useAuth();
  const { isKeyboardVisible } = useDevice();
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

  const directStoreId = searchParams.get('store');

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // Fetch direct store info
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
        .select(`*, store:stores(id, name, logo_url)`)
        .eq('customer_id', user.id)
        .order('last_message_at', { ascending: false });
      if (error) throw error;

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

  // Fetch messages
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

  // Fetch purchased stores
  const { data: purchasedStores = [] } = useQuery({
    queryKey: ['purchased-stores', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`id, created_at, order_items(product_name, product:products(store_id, store:stores(id, name, logo_url)))`)
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
        .order('created_at', { ascending: false });
      if (error) throw error;

      const storeMap = new Map<string, PurchasedStore>();
      (data || []).forEach((order) => {
        order.order_items?.forEach((item) => {
          const store = item.product?.store;
          if (!store) return;
          if (!storeMap.has(store.id)) {
            storeMap.set(store.id, {
              store_id: store.id,
              store_name: store.name,
              logo_url: store.logo_url,
              orders: [{ order_id: order.id, order_date: order.created_at, product_names: [item.product_name] }],
            });
          } else {
            const existing = storeMap.get(store.id)!;
            const existingOrder = existing.orders.find(o => o.order_id === order.id);
            if (existingOrder) {
              if (!existingOrder.product_names.includes(item.product_name)) {
                existingOrder.product_names.push(item.product_name);
              }
            } else {
              existing.orders.push({ order_id: order.id, order_date: order.created_at, product_names: [item.product_name] });
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['store-messages'] });
        queryClient.invalidateQueries({ queryKey: ['store-conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (isKeyboardVisible && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [isKeyboardVisible]);

  // Create conversation
  const createConversationMutation = useMutation({
    mutationFn: async ({ storeId, orderId, subject, initialMessage }: { storeId: string; orderId: string | null; subject: string; initialMessage: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('store_conversations')
        .insert({ store_id: storeId, customer_id: user.id, order_id: orderId, subject: subject || null })
        .select()
        .single();
      if (error) throw error;
      if (initialMessage.trim()) {
        await supabase.from('store_messages').insert({
          conversation_id: data.id, store_id: storeId, customer_id: user.id, sender_type: 'customer', message: initialMessage.trim(),
        });
        await supabase.from('store_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', data.id);
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

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      if (!user) throw new Error('Not authenticated');
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) throw new Error('Conversation not found');
      const { error } = await supabase.from('store_messages').insert({
        conversation_id: conversationId, store_id: conversation.store_id, customer_id: user.id, sender_type: 'customer', message,
      });
      if (error) throw error;
      await supabase.from('store_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
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
    const finalSubject = newSubject.trim() || (issueDescription.trim() ? issueDescription.trim().slice(0, 100) : '');
    if (directStore) {
      createConversationMutation.mutate({ storeId: directStore.id, orderId: selectedOrderId, subject: finalSubject, initialMessage: issueDescription.trim() });
      return;
    }
    if (!selectedStore) return;
    createConversationMutation.mutate({ storeId: selectedStore.store_id, orderId: selectedOrderId, subject: finalSubject, initialMessage: issueDescription.trim() });
  };

  const getStoreProductNames = (store: PurchasedStore) => {
    const allProducts = store.orders.flatMap(o => o.product_names);
    return [...new Set(allProducts)];
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return {
    user,
    scrollRef,
    selectedConversation,
    setSelectedConversation,
    newMessage,
    setNewMessage,
    showNewConversation,
    setShowNewConversation,
    newSubject,
    setNewSubject,
    issueDescription,
    setIssueDescription,
    selectedStore,
    setSelectedStore,
    selectedOrderId,
    setSelectedOrderId,
    directStore,
    conversations,
    conversationsLoading,
    messages,
    messagesLoading,
    purchasedStores,
    createConversationMutation,
    sendMessageMutation,
    handleSend,
    handleStartConversation,
    getStoreProductNames,
    selectedConv,
    searchParams,
    setSearchParams,
  };
}
