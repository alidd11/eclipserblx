import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDropZone } from '@/hooks/useDropZone';
import { cn } from '@/lib/utils';
import { hapticTap, hapticError } from '@/lib/haptics';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { toast } from 'sonner';
import { ConversationList } from '@/components/admin/live-chat/ConversationList';
import { ChatMessageThread } from '@/components/admin/live-chat/ChatMessageThread';
import { Conversation, Message } from '@/components/admin/live-chat/ChatConstants';

export default function AdminLiveChat() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, { customer_id: string | null }>>({});
  const [customerOrders, setCustomerOrders] = useState<Array<{ id: string; total: number; status: string; created_at: string; items: Array<{ product_name: string; price: number }> }>>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);
  const { playSound } = useNotificationSound();
  const { sendNotification, requestPermission, permission } = usePushNotifications();

  useEffect(() => {
    if (permission === 'default') requestPermission();
  }, [permission, requestPermission]);

  const handleTyping = () => {
    if (!selectedConversation) return;
    const channel = typingChannelRef.current;
    if (!channel) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channel.track({ typing: true, role: 'agent' });
    typingTimeoutRef.current = setTimeout(() => { channel.track({ typing: false, role: 'agent' }); }, 2000);
  };

  // Load conversations
  useEffect(() => {
    loadConversations();
    const channel = supabase.channel('admin-conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => { loadConversations(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Subscribe to messages and typing for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;
    setMessages([]);
    setCustomerOrders([]);
    loadMessages(selectedConversation.id);
    setCustomerTyping(false);
    if (selectedConversation.user_id) loadCustomerOrders(selectedConversation.user_id);

    const messagesChannel = supabase.channel(`admin-chat-${selectedConversation.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
      const newMsg = payload.new as Message;
      setMessages((prev) => {
        const optimisticIdx = prev.findIndex((m) => m._tempId && m.message === newMsg.message && m.sender_type === newMsg.sender_type);
        if (optimisticIdx !== -1) { const updated = [...prev]; updated[optimisticIdx] = { ...newMsg, _status: 'sent' }; return updated; }
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        if (newMsg.sender_type === 'customer') {
          playSound();
          if (document.hidden) sendNotification('New customer message', { body: `${selectedConversation.customer_name || 'Customer'}: ${newMsg.message.substring(0, 100)}`, tag: `admin-chat-message-${newMsg.id}` });
        }
        return [...prev, newMsg];
      });
    }).subscribe();

    const typingChannel = supabase.channel(`typing-${selectedConversation.id}`).on('presence', { event: 'sync' }, () => {
      const state = typingChannel.presenceState();
      const isTyping = Object.values(state).some((presences) => presences.some((p) => (p as any).typing && (p as any).role === 'customer'));
      setCustomerTyping(isTyping);
    }).subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation?.id]);

  const loadConversations = async () => {
    const { data } = await supabase.from('chat_conversations').select('*').not('status', 'in', '("closed","resolved")').order('updated_at', { ascending: false });
    if (data) {
      setConversations(data);
      const userIds = data.filter(c => c.user_id).map(c => c.user_id) as string[];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, customer_id').in('user_id', userIds);
        if (profiles) {
          const profileMap: Record<string, { customer_id: string | null }> = {};
          profiles.forEach(p => { profileMap[p.user_id] = { customer_id: p.customer_id }; });
          setCustomerProfiles(profileMap);
        }
      }
    }
    setIsLoading(false);
  };

  const mergeServerMessages = (prev: Message[], server: Message[]) => {
    const merged: Message[] = [...server];
    const byId = new Set(merged.map((m) => m.id));
    const hasEquivalentOnServer = (local: Message) => {
      if (!local._tempId) return false;
      const localTs = new Date(local.created_at).getTime();
      return merged.some((m) => m.sender_type === local.sender_type && m.sender_id === local.sender_id && m.message === local.message && Math.abs(new Date(m.created_at).getTime() - localTs) < 5 * 60 * 1000);
    };
    for (const local of prev) { if (byId.has(local.id)) continue; if (hasEquivalentOnServer(local)) continue; merged.push(local); byId.add(local.id); }
    merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return merged;
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (data) setMessages((prev) => mergeServerMessages(prev, data as Message[]));
  };

  const loadCustomerOrders = async (userId: string) => {
    setLoadingOrders(true);
    const { data } = await supabase.from('orders').select('id, total, status, created_at, order_items (product_name, price)').eq('user_id', userId).in('status', ['paid', 'completed']).order('created_at', { ascending: false }).limit(5);
    if (data) setCustomerOrders(data.map(o => ({ id: o.id, total: o.total, status: o.status, created_at: o.created_at, items: o.order_items || [] })));
    else setCustomerOrders([]);
    setLoadingOrders(false);
  };

  const sendMessage = async (retryTempId?: string) => {
    let messageText: string;
    let tempId: string;

    if (retryTempId) {
      const failedMsg = messages.find((m) => m._tempId === retryTempId);
      if (!failedMsg) return;
      messageText = failedMsg.message;
      tempId = retryTempId;
      setMessages((prev) => prev.map((m) => (m._tempId === tempId ? { ...m, _status: 'pending' as const } : m)));
    } else {
      if (!newMessage.trim() || !selectedConversation || !user) return;
      messageText = newMessage.trim();
      tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setNewMessage('');
      const optimisticMsg: Message = { id: tempId, message: messageText, sender_type: 'agent', sender_id: user.id, created_at: new Date().toISOString(), attachment_url: null, _status: 'pending', _tempId: tempId };
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    try {
      const { data, error } = await supabase.from('chat_messages').insert({ conversation_id: selectedConversation!.id, message: messageText, sender_type: 'agent', sender_id: user!.id }).select('*').single();
      if (error) throw error;
      if (data) { hapticTap(); setMessages((prev) => prev.map((m) => (m._tempId === tempId ? { ...data, secure_data: data.secure_data as any, _status: 'sent' as const } as Message : m))); }
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation!.id);
    } catch (error) {
      console.error('Error sending message:', error);
      hapticError();
      toast.error('Failed to send message', { description: error?.message || 'Please try again' });
      setMessages((prev) => prev.map((m) => (m._tempId === tempId ? { ...m, _status: 'failed' as const } : m)));
    }
  };

  const removeFailedMessage = (tempId: string) => {
    setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
  };

  const processFileUpload = useCallback(async (file: File) => {
    if (!selectedConversation || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB'); return; }
    setIsUploading(true);
    try {
      toast.info('Scanning file...', { id: 'admin-file-scan' });
      const scanResult = await performSecurityScan(file);
      if (!scanResult.isAllowed) { toast.dismiss('admin-file-scan'); toast.error(scanResult.reason || 'File blocked by security scan'); return; }
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) toast.warning(`File has concerns: ${scanResult.luaConcerns[0]}`, { duration: 5000 });
      toast.dismiss('admin-file-scan');

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase.from('chat_messages').insert({ conversation_id: selectedConversation.id, message: file.name, sender_type: 'agent', sender_id: user.id, attachment_url: fileName }).select('*').single();
      if (insertError) throw insertError;
      if (inserted) setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, { ...inserted, secure_data: inserted.secure_data as any } as Message]));
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation.id);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedConversation, user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFileUpload(file);
  };

  const { isDragOver: isChatDragOver, dragProps: chatDragProps } = useDropZone({
    onDrop: (files) => { if (files[0]) processFileUpload(files[0]); },
    accept: ['image/*', '.pdf', '.doc', '.docx', '.txt'],
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: isUploading || !selectedConversation,
  });

  const closeConversation = async () => {
    if (!selectedConversation || !user) return;
    await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', selectedConversation.id);
    await supabase.from('staff_activity').insert({ user_id: user.id, activity_type: 'chat_completed', resource_id: selectedConversation.id, resource_type: 'chat_conversation', details: { customer_name: selectedConversation.customer_name, customer_email: selectedConversation.customer_email } });
    setSelectedConversation(null);
    loadConversations();
  };

  const claimConversation = async (conv: Conversation) => {
    if (!user) return;
    setSelectedConversation(conv);
    await supabase.from('staff_activity').insert({ user_id: user.id, activity_type: 'chat_claimed', resource_id: conv.id, resource_type: 'chat_conversation', details: { customer_name: conv.customer_name, customer_email: conv.customer_email } });
  };

  return (
    <AdminLayout requiredPermissions={['view_live_chat']}>
      <div className="h-full flex flex-col min-h-0 overflow-hidden p-3 lg:p-4 pb-[max(0.75rem,var(--chat-safe-bottom,env(safe-area-inset-bottom)))]">
        {/* Header */}
        <div className="border border-border rounded-xl overflow-hidden bg-card border-border mb-3 shrink-0">
          <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2 py-2.5 lg:py-4">
            <h3 className="font-semibold text-sm text-lg sm:text-2xl font-display">Live Chat</h3>
            <p className="text-muted-foreground text-xs sm:text-sm">Respond to customer inquiries in real-time</p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-3 lg:gap-4 min-h-0 overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            isLoading={isLoading}
            onSelect={claimConversation}
          />

          {selectedConversation ? (
            <ChatMessageThread
              selectedConversation={selectedConversation}
              messages={messages}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={sendMessage}
              onRemoveFailedMessage={removeFailedMessage}
              onCloseConversation={closeConversation}
              onBack={() => setSelectedConversation(null)}
              customerTyping={customerTyping}
              isUploading={isUploading}
              onFileUpload={handleFileUpload}
              onTyping={handleTyping}
              isAdmin={isAdmin}
              customerProfiles={customerProfiles}
              customerOrders={customerOrders}
              loadingOrders={loadingOrders}
              isChatDragOver={isChatDragOver}
              chatDragProps={selectedConversation ? chatDragProps : {}}
            />
          ) : (
            <div className={cn("border border-border rounded-lg bg-card flex flex-col overflow-hidden flex-1 min-w-0 min-h-0", "hidden lg:flex")}>
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm lg:text-base p-4 text-center">
                <span className="hidden lg:inline">Select a conversation to start chatting</span>
                <span className="lg:hidden">Tap a conversation to start chatting</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
