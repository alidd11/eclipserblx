import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatPanel } from '@/hooks/useChatPanel';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Paperclip, Loader2, ShieldCheck, Minimize2, Maximize2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SecureCodeInput } from './SecureCodeInput';
import { cn } from '@/lib/utils';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { motion, AnimatePresence } from 'framer-motion';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { notifyNewLiveChat } from '@/lib/pushNotifications';
import { ChatStartForm } from './ChatStartForm';
import { ChatMessageList } from './ChatMessageList';

interface SecureData {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  code_id?: string;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
  attachment_url?: string | null;
  message_type?: string | null;
  secure_data?: SecureData | null;
}

interface Conversation {
  id: string;
  status: string;
  issue_category: string | null;
  created_at: string;
}

// Opening hours configuration
const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null, 1: { open: 9, close: 19 }, 2: { open: 9, close: 19 },
  3: { open: 9, close: 19 }, 4: { open: 9, close: 19 },
  5: { open: 9, close: 19 }, 6: { open: 9, close: 19 },
};

function getOpeningStatus() {
  const now = new Date();
  const todayHours = OPENING_HOURS[now.getDay()];
  return { isOpen: todayHours ? now.getHours() >= todayHours.open && now.getHours() < todayHours.close : false };
}

export const ChatSidePanel = forwardRef<HTMLDivElement>(function ChatSidePanel(_props, _ref) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOpen, closeChat } = useChatPanel();
  const { isCustomStoreDomain } = useStoreDomain();
  const openingStatus = getOpeningStatus();
  const { playSound } = useNotificationSound();

  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSecureInput, setShowSecureInput] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ display_name: string | null; customer_id: string | null } | null>(null);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_WARNING_MS = 3 * 60 * 1000;
  const INACTIVITY_CLOSE_MS = 5 * 60 * 1000;

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setInactivityWarning(false);
    warningTimerRef.current = setTimeout(() => setInactivityWarning(true), INACTIVITY_WARNING_MS);
    inactivityTimerRef.current = setTimeout(async () => {
      if (conversation) {
        await supabase.from('chat_conversations').update({ status: 'closed' }).eq('id', conversation.id);
        setIsChatClosed(true);
      }
    }, INACTIVITY_CLOSE_MS);
  }, [conversation]);

  const handleStartNewConversation = useCallback(() => {
    if (typingChannelRef.current) { supabase.removeChannel(typingChannelRef.current); typingChannelRef.current = null; }
    [typingTimeoutRef, inactivityTimerRef, warningTimerRef].forEach(ref => { if (ref.current) { clearTimeout(ref.current); ref.current = null; } });
    setConversation(null); setMessages([]); setIsChatClosed(false); setIsEscalated(false);
    setInactivityWarning(false); setIssueCategory(''); setIssueDescription('');
    setIsAgentTyping(false); setIsAiResponding(false);
  }, []);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (conversation && !isChatClosed) resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [conversation, isChatClosed, resetInactivityTimer]);

  useEffect(() => {
    if (!authLoading && !user && isOpen) {
      closeChat();
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [user, authLoading, isOpen, closeChat, navigate]);

  useEffect(() => {
    if (authLoading || !user || !isOpen) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: profile } = await supabase.from('profiles').select('display_name, customer_id').eq('user_id', user.id).maybeSingle();
        if (profile) setCustomerProfile(profile);
        const { data: existingConv } = await supabase.from('chat_conversations').select('id, status, issue_category, created_at').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (existingConv) { setConversation(existingConv); await loadMessages(existingConv.id); }
      } catch (error) { console.error('Error loading conversation:', error); }
      finally { setIsLoading(false); }
    };
    loadData();
  }, [user, authLoading, isOpen]);

  useEffect(() => {
    if (!conversation?.id) return;
    const channel = supabase.channel(`chat_panel_${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversation.id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (newMsg.sender_type === 'agent') playSound('info');
      }).subscribe();
    const typingChannel = supabase.channel(`typing-${conversation.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        setIsAgentTyping(Object.values(state).some((presences: any) => presences.some((p: any) => p.typing && p.role === 'agent')));
      }).subscribe();
    typingChannelRef.current = typingChannel;
    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversation?.id]);

  useEffect(() => { if (!isOpen) setIsMinimized(false); }, [isOpen]);

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase.from('chat_messages').select('id, message, sender_type, created_at, attachment_url, message_type, secure_data').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    setMessages((data || []).map(msg => ({ ...msg, secure_data: msg.secure_data as unknown as SecureData | null })));
  };

  const handleTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channel.track({ typing: true, role: 'customer' });
    typingTimeoutRef.current = setTimeout(() => channel.track({ typing: false, role: 'customer' }), 2000);
  }, []);

  const startConversation = async () => {
    if (!user || !issueCategory || !issueDescription.trim()) { toast.error('Please fill in all fields'); return; }
    setIsSending(true);
    try {
      const { data: newConv, error: convError } = await supabase.from('chat_conversations').insert({ user_id: user.id, customer_email: user.email, customer_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer', issue_category: issueCategory, status: 'active' }).select().single();
      if (convError) throw convError;
      const initialMessage = issueDescription.trim();
      const { error: msgError } = await supabase.from('chat_messages').insert({ conversation_id: newConv.id, sender_type: 'customer', sender_id: user.id, message: initialMessage });
      if (msgError) throw msgError;
      setConversation(newConv); await loadMessages(newConv.id); setIssueDescription('');
      notifyNewLiveChat({ id: newConv.id, customer_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer', issue_category: issueCategory }).catch(() => {});
      setIsAiResponding(true);
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-chat-support', { body: { conversationId: newConv.id, userMessage: initialMessage, issueCategory, userId: user.id } });
        if (aiData?.escalated) setIsEscalated(true);
      } catch {} finally { setIsAiResponding(false); }
    } catch { toast.error('Failed to start conversation'); }
    finally { setIsSending(false); }
  };

  const sendMessage = async () => {
    if (!conversation || !newMessage.trim() || isSending) return;
    const messageText = newMessage.trim();
    setNewMessage(''); setIsSending(true); resetInactivityTimer();
    const optimisticId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: optimisticId, message: messageText, sender_type: 'customer', created_at: new Date().toISOString() }]);
    try {
      const { error } = await supabase.from('chat_messages').insert({ conversation_id: conversation.id, sender_type: 'customer', sender_id: user?.id, message: messageText });
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      if (!isEscalated) {
        setIsAiResponding(true);
        try {
          const { data: aiData } = await supabase.functions.invoke('ai-chat-support', { body: { conversationId: conversation.id, userMessage: messageText, issueCategory: conversation.issue_category, userId: user?.id } });
          if (aiData?.escalated) setIsEscalated(true);
          if (aiData?.shouldClose) { setIsChatClosed(true); if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); if (warningTimerRef.current) clearTimeout(warningTimerRef.current); }
        } catch {} finally { setIsAiResponding(false); }
      }
    } catch { toast.error('Failed to send message'); setMessages(prev => prev.filter(m => m.id !== optimisticId)); setNewMessage(messageText); }
    finally { setIsSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large. Maximum size is 10MB'); return; }
    setIsUploading(true);
    try {
      toast.info('Scanning file...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file);
      if (!scanResult.isAllowed) { toast.dismiss('security-scan'); toast.error(scanResult.reason || 'File blocked'); return; }
      toast.dismiss('security-scan');
      const fileName = `${conversation.id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { error: msgError } = await supabase.from('chat_messages').insert({ conversation_id: conversation.id, sender_type: 'customer', sender_id: user?.id, message: `📎 ${file.name}`, attachment_url: fileName });
      if (msgError) throw msgError;
      toast.success('File uploaded');
    } catch { toast.error('Failed to upload file'); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (isCustomStoreDomain) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          data-gesture-exempt="true"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed bg-background border border-border rounded-lg shadow-lg z-[9998] flex flex-col overflow-hidden',
            isMinimized ? 'w-72 h-12' : 'w-[calc(100vw-2rem)] sm:w-96 h-[min(500px,70dvh)]'
          )}
          style={{ bottom: 'max(5rem, env(safe-area-inset-bottom, 0px) + 5rem)', right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)' }}
          onClick={isMinimized ? (e) => { e.stopPropagation(); setIsMinimized(false); } : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b bg-muted/50 shrink-0">
            {isMinimized ? (
              <div className="flex items-center gap-2 w-full cursor-pointer">
                <div className={cn('h-2 w-2 rounded-full animate-pulse', openingStatus.isOpen ? 'bg-green-500' : 'bg-yellow-500')} />
                <span className="font-medium text-xs">Live Support</span>
                <span className="text-[10px] text-muted-foreground">{openingStatus.isOpen ? 'Open' : 'Closed'}</span>
                <Maximize2 className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full animate-pulse', openingStatus.isOpen ? 'bg-green-500' : 'bg-yellow-500')} />
                  <span className="font-medium text-xs">Live Support</span>
                  <span className="text-[10px] text-muted-foreground">{openingStatus.isOpen ? 'Open' : 'Closed'}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}><Minimize2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeChat}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0">
              {authLoading || isLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : !conversation ? (
                <ChatStartForm
                  customerProfile={customerProfile}
                  userEmail={user?.email}
                  issueCategory={issueCategory}
                  onIssueCategoryChange={setIssueCategory}
                  issueDescription={issueDescription}
                  onIssueDescriptionChange={setIssueDescription}
                  onStart={startConversation}
                  isSending={isSending}
                  isOpen={openingStatus.isOpen}
                  onCloseChat={closeChat}
                />
              ) : isChatClosed ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Chat Ended</h3>
                  <p className="text-sm text-muted-foreground mb-4">Thanks for chatting with us!</p>
                  <Button onClick={handleStartNewConversation} className="w-full max-w-[200px]">Start New Chat</Button>
                </div>
              ) : (
                <>
                  <ChatMessageList
                    messages={messages}
                    isEscalated={isEscalated}
                    isAiResponding={isAiResponding}
                    isAgentTyping={isAgentTyping}
                    inactivityWarning={inactivityWarning}
                  />
                  <SecureCodeInput open={showSecureInput} onOpenChange={setShowSecureInput} conversationId={conversation.id} onSuccess={() => { loadMessages(conversation.id); setShowSecureInput(false); }} />
                  <div className="p-3 border-t bg-background">
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt" />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowSecureInput(true)} title="Submit secure code">
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message..."
                        className="flex-1 h-8 text-sm min-w-0"
                      />
                      <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
