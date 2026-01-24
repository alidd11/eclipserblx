import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatPanel } from '@/hooks/useChatPanel';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Paperclip, Loader2, ShieldCheck, Minimize2, Maximize2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SecureCodeInput } from './SecureCodeInput';
import { CodeVerificationMessage } from './CodeVerificationMessage';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { notifyNewLiveChat } from '@/lib/pushNotifications';

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

const ISSUE_CATEGORIES = [
  { value: 'order', label: 'Order Issue' },
  { value: 'product', label: 'Product Question' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'other', label: 'Other' },
];

// Opening hours configuration
const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null, // Sunday - Closed
  1: { open: 9, close: 19 }, // Monday 9am-7pm
  2: { open: 9, close: 19 }, // Tuesday 9am-7pm
  3: { open: 9, close: 19 }, // Wednesday 9am-7pm
  4: { open: 9, close: 19 }, // Thursday 9am-7pm
  5: { open: 9, close: 19 }, // Friday 9am-7pm
  6: { open: 9, close: 19 }, // Saturday 9am-7pm
};

function formatTime(h: number) {
  const period = h >= 12 ? 'pm' : 'am';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}${period}`;
}

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const todayHours = OPENING_HOURS[day];
  const isOpen = todayHours ? hour >= todayHours.open && hour < todayHours.close : false;
  return { isOpen };
}

export const ChatSidePanel = forwardRef<HTMLDivElement>(function ChatSidePanel(_props, _ref) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOpen, closeChat } = useChatPanel();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user && isOpen) {
      closeChat();
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [user, authLoading, isOpen, closeChat, navigate]);

  // Load existing conversation and profile
  useEffect(() => {
    if (authLoading || !user || !isOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load profile for display name and customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, customer_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setCustomerProfile(profile);
        }

        // Load existing conversation
        const { data: existingConv, error } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (existingConv) {
          setConversation(existingConv);
          await loadMessages(existingConv.id);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, isOpen]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat_panel_${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          // Play sound for agent messages
          if (newMsg.sender_type === 'agent') {
            playSound('info');
          }
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing-${conversation.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const isTyping = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.typing && p.role === 'agent')
        );
        setIsAgentTyping(isTyping);
      })
      .subscribe();

    // Store ref for customer typing broadcast
    typingChannelRef.current = typingChannel;

    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversation?.id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle customer typing broadcast
  const handleTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing status
    channel.track({ typing: true, role: 'customer' });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, role: 'customer' });
    }, 2000);
  }, []);

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const mappedMessages: Message[] = (data || []).map(msg => ({
      id: msg.id,
      message: msg.message,
      sender_type: msg.sender_type,
      created_at: msg.created_at,
      attachment_url: msg.attachment_url,
      message_type: msg.message_type,
      secure_data: msg.secure_data as unknown as SecureData | null,
    }));

    setMessages(mappedMessages);
    scrollToBottom();
  };

  const startConversation = async () => {
    if (!user || !issueCategory || !issueDescription.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      const { data: newConv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          customer_email: user.email,
          customer_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer',
          issue_category: issueCategory,
          status: 'active',
        })
        .select()
        .single();

      if (convError) throw convError;

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: newConv.id,
          sender_type: 'customer',
          sender_id: user.id,
          message: issueDescription.trim(),
        });

      if (msgError) throw msgError;

      setConversation(newConv);
      await loadMessages(newConv.id);
      setIssueDescription('');

      // Notify staff about the new live chat
      notifyNewLiveChat({
        id: newConv.id,
        customer_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer',
        issue_category: issueCategory,
      }).catch(err => console.error('Failed to send push notification:', err));
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || !newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      message: messageText,
      sender_type: 'customer',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          sender_id: user?.id,
          message: messageText,
        });

      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setIsUploading(true);
    try {
      // Security scan
      toast.info('Scanning file...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file);
      
      if (!scanResult.isAllowed) {
        toast.dismiss('security-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
      
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) {
        toast.warning(`File has concerns: ${scanResult.luaConcerns[0]}`, { duration: 5000 });
      }
      
      toast.dismiss('security-scan');

      const fileExt = file.name.split('.').pop();
      const fileName = `${conversation.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          sender_id: user?.id,
          message: `📎 ${file.name}`,
          attachment_url: urlData.publicUrl,
        });

      if (msgError) throw msgError;
      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSecureCodeSuccess = () => {
    if (conversation) {
      loadMessages(conversation.id);
    }
    setShowSecureInput(false);
  };

  


  // Reset isMinimized when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

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
            'fixed bg-background border border-border rounded-xl shadow-2xl z-[9998] flex flex-col overflow-hidden',
            isMinimized 
              ? 'w-72 h-12' 
              : 'w-[calc(100vw-2rem)] sm:w-96 h-[min(500px,70dvh)]'
          )}
          style={{ 
            bottom: 'max(5rem, env(safe-area-inset-bottom, 0px) + 5rem)',
            right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)',
          }}
          onClick={isMinimized ? (e) => { e.stopPropagation(); setIsMinimized(false); } : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 border-b bg-muted/50 shrink-0">
            {isMinimized ? (
              <div className="flex items-center gap-2 w-full cursor-pointer">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full animate-pulse',
                    openingStatus.isOpen ? 'bg-green-500' : 'bg-yellow-500'
                  )}
                />
                <span className="font-medium text-xs">Live Support</span>
                <span className="text-[10px] text-muted-foreground">
                  {openingStatus.isOpen ? 'Open' : 'Closed'}
                </span>
                <Maximize2 className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full animate-pulse',
                        openingStatus.isOpen ? 'bg-green-500' : 'bg-yellow-500'
                      )}
                    />
                    <span className="font-medium text-xs">Live Support</span>
                    <span className="text-[10px] text-muted-foreground">
                      {openingStatus.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsMinimized(true)}
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={closeChat}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0">
              {authLoading || isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !conversation ? (
                // Start conversation form
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  {/* Customer Info Card */}
                  {customerProfile && (
                    <div className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {(customerProfile.display_name || user?.email)?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {customerProfile.display_name || user?.email?.split('@')[0] || 'Customer'}
                          </p>
                          {customerProfile.customer_id && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {customerProfile.customer_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="panel-category" className="text-sm">What can we help you with?</Label>
                    <Select value={issueCategory} onValueChange={setIssueCategory}>
                      <SelectTrigger id="panel-category" className="h-9">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]" position="popper" sideOffset={4}>
                        {ISSUE_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="panel-description" className="text-sm">Describe your issue</Label>
                    <Textarea
                      id="panel-description"
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      placeholder="Please describe your issue..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>

                  <Button
                    onClick={startConversation}
                    disabled={!issueCategory || !issueDescription.trim() || isSending}
                    className="w-full"
                    size="sm"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Start Conversation'
                    )}
                  </Button>
                </div>
              ) : (
                // Chat interface
                <>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                              msg.sender_type === 'customer'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {msg.message_type === 'code_verification' && msg.secure_data ? (
                              <CodeVerificationMessage
                                secureData={msg.secure_data}
                                isStaffView={false}
                              />
                            ) : (
                              <>
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                {msg.attachment_url && (
                                  <a
                                    href={msg.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline mt-1 block opacity-80 hover:opacity-100"
                                  >
                                    View attachment
                                  </a>
                                )}
                              </>
                            )}
                            <span className="text-xs opacity-60 mt-1 block">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      ))}

                      {isAgentTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                              <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <SecureCodeInput
                    open={showSecureInput}
                    onOpenChange={setShowSecureInput}
                    conversationId={conversation.id}
                    onSuccess={handleSecureCodeSuccess}
                  />

                  {/* Input area */}
                  <div className="p-3 border-t bg-background">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setShowSecureInput(true)}
                        title="Submit secure code"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Input
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 h-8 text-sm min-w-0"
                      />
                      <Button
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSending}
                      >
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
