import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatPanel } from '@/hooks/useChatPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Paperclip, Loader2, ShieldCheck, Minimize2, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SecureCodeInput } from './SecureCodeInput';
import { CodeVerificationMessage } from './CodeVerificationMessage';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

export function ChatSidePanel() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOpen, closeChat } = useChatPanel();
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
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  

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

  // Load existing conversation
  useEffect(() => {
    if (authLoading || !user || !isOpen) return;

    const loadConversation = async () => {
      setIsLoading(true);
      try {
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

    loadConversation();
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
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing_panel_${conversation.id}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.sender_type === 'agent') {
          setIsAgentTyping(true);
          setTimeout(() => setIsAgentTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversation?.id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  if (!isOpen) return null;

  const handleDragEnd = () => {
    if (dragY > 100) {
      setIsMinimized(true);
    }
    setDragY(0);
    setIsDragging(false);
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
          initial={{ x: '100%', y: 0 }}
          animate={{ 
            x: 0,
            y: isMinimized ? 'calc(100dvh - 60px)' : isDragging ? dragY : 0
          }}
          exit={{ x: '100%', y: 0 }}
          transition={
            isDragging 
              ? { duration: 0 } 
              : { type: 'spring', damping: 25, stiffness: 200 }
          }
          drag={!isMinimized ? 'y' : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDrag={(_, info) => {
            if (info.offset.y > 0) {
              setIsDragging(true);
              setDragY(info.offset.y);
            }
          }}
          onDragEnd={handleDragEnd}
          className={cn(
            'fixed top-0 right-0 h-[100dvh] bg-background border-l border-border shadow-xl z-[100] flex flex-col touch-none',
            isMinimized ? 'w-full sm:w-96 cursor-pointer' : 'w-full sm:w-96'
          )}
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          onClick={isMinimized ? (e) => { e.stopPropagation(); setIsMinimized(false); } : undefined}
        >
          {/* Swipe indicator */}
          {!isMinimized && (
            <div className="flex justify-center py-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            {isMinimized ? (
              <div className="flex items-center gap-2 w-full">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium text-sm">Live Support</span>
                <span className="text-xs text-muted-foreground ml-auto">Tap to expand</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium text-sm">Live Support</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsMinimized(true)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={closeChat}
                  >
                    <X className="h-4 w-4" />
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
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="panel-category" className="text-sm">What can we help you with?</Label>
                    <Select value={issueCategory} onValueChange={setIssueCategory}>
                      <SelectTrigger id="panel-category" className="h-9">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
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
                        onChange={(e) => setNewMessage(e.target.value)}
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
}
