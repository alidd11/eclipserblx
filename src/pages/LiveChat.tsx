import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Paperclip, Loader2, ShieldCheck, Shield, Bot, User, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SecureCodeInput } from '@/components/chat/SecureCodeInput';
import { CodeVerificationMessage } from '@/components/chat/CodeVerificationMessage';
import { MainLayout } from '@/components/layout/MainLayout';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { parseMessageWithLinks } from '@/lib/chatLinks';
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

const LiveChatPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { playSound } = useNotificationSound();
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
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_WARNING_MS = 3 * 60 * 1000; // 3 minutes
  const INACTIVITY_CLOSE_MS = 5 * 60 * 1000; // 5 minutes total

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Reset inactivity timer on activity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setInactivityWarning(false);

    // Warning at 3 minutes
    warningTimerRef.current = setTimeout(() => {
      setInactivityWarning(true);
    }, INACTIVITY_WARNING_MS);

    // Auto-close at 5 minutes
    inactivityTimerRef.current = setTimeout(async () => {
      if (conversation) {
        await supabase
          .from('chat_conversations')
          .update({ status: 'closed' })
          .eq('id', conversation.id);
        setIsChatClosed(true);
      }
    }, INACTIVITY_CLOSE_MS);
  }, [conversation, INACTIVITY_WARNING_MS, INACTIVITY_CLOSE_MS]);

  // Close chat manually
  const handleCloseConversation = useCallback(async () => {
    if (!conversation) return;
    
    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', conversation.id);
    
    setIsChatClosed(true);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, [conversation]);

  // Start new conversation after closing
  const handleStartNewConversation = useCallback(() => {
    // Clean up existing channels before resetting state
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    
    // Reset all state
    setConversation(null);
    setMessages([]);
    setIsChatClosed(false);
    setIsEscalated(false);
    setInactivityWarning(false);
    setIssueCategory('');
    setIssueDescription('');
    setIsAgentTyping(false);
    setIsAiResponding(false);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Start inactivity timer when conversation is active
  useEffect(() => {
    if (conversation && !isChatClosed) {
      resetInactivityTimer();
    }
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [conversation, isChatClosed, resetInactivityTimer]);

  // Load existing conversation
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth?redirect=/support/chat');
      return;
    }

    const loadConversation = async () => {
      setIsLoading(true);
      try {
        // Check for existing active conversation
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
  }, [user, authLoading, navigate]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversation?.id || isChatClosed) return;

    const channel = supabase
      .channel(`chat_messages_${conversation.id}`)
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

    // Store ref for cleanup
    messagesChannelRef.current = channel;

    // Typing indicator channel - uses presence to match admin's broadcast
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
      messagesChannelRef.current = null;
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversation?.id, isChatClosed, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle viewport resize for keyboard - scroll chat to bottom when keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;
    let timers: number[] = [];

    const handleViewportResize = () => {
      const heightDelta = Math.abs(vv.height - lastHeight);
      // Only react to significant height changes (keyboard open/close)
      if (heightDelta > 50) {
        lastHeight = vv.height;
        // Clear any pending scroll timers
        timers.forEach(t => clearTimeout(t));
        // Staggered scrolls to handle iOS keyboard animation settling
        timers = [
          window.setTimeout(scrollToBottom, 0),
          window.setTimeout(scrollToBottom, 100),
          window.setTimeout(scrollToBottom, 250),
          window.setTimeout(scrollToBottom, 400),
        ];
      }
    };

    vv.addEventListener('resize', handleViewportResize);

    return () => {
      timers.forEach(t => clearTimeout(t));
      vv.removeEventListener('resize', handleViewportResize);
    };
  }, [scrollToBottom]);

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

    // Map to Message type
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
      // Create conversation
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

      const initialMessage = issueDescription.trim();

      // Send initial message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: newConv.id,
          sender_type: 'customer',
          sender_id: user.id,
          message: initialMessage,
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

      // Trigger AI response for initial message
      setIsAiResponding(true);
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat-support', {
          body: {
            conversationId: newConv.id,
            userMessage: initialMessage,
            issueCategory: issueCategory,
          },
        });

        if (aiError) {
          console.error('AI response error:', aiError);
        } else if (aiData?.escalated) {
          setIsEscalated(true);
        }
      } catch (aiErr) {
        console.error('AI chat error:', aiErr);
      } finally {
        setIsAiResponding(false);
      }
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
    resetInactivityTimer(); // Reset timer on activity

    // Optimistic update
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

      // Remove optimistic message (real one will come via realtime)
      setMessages(prev => prev.filter(m => m.id !== optimisticId));

      // Only call AI if not escalated to human staff
      if (!isEscalated) {
        setIsAiResponding(true);
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat-support', {
            body: {
              conversationId: conversation.id,
              userMessage: messageText,
              issueCategory: conversation.issue_category,
            },
          });

          if (aiError) {
            console.error('AI response error:', aiError);
          } else {
            if (aiData?.escalated) {
              setIsEscalated(true);
            }
            // Check if AI detected chat should close
            if (aiData?.shouldClose) {
              setIsChatClosed(true);
              if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
              if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            }
          }
        } catch (aiErr) {
          console.error('AI chat error:', aiErr);
        } finally {
          setIsAiResponding(false);
        }
      }
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
      toast.info('Scanning file for threats...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file);
      
      if (!scanResult.isAllowed) {
        toast.dismiss('security-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
      
      // Show warning for medium-risk Lua files
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) {
        toast.warning(`File has some concerns: ${scanResult.luaConcerns[0]}`, { duration: 5000 });
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
    // Reload messages to show the verification result
    if (conversation) {
      loadMessages(conversation.id);
    }
    setShowSecureInput(false);
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Live Support</h1>
            <p className="text-sm text-muted-foreground">
              {conversation ? 'Chat with our support team' : 'Start a new conversation'}
            </p>
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          {!conversation ? (
            // Start conversation form
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">What can we help you with?</Label>
                <Select value={issueCategory} onValueChange={setIssueCategory}>
                  <SelectTrigger id="category">
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
                <Label htmlFor="description">Describe your issue</Label>
                <Textarea
                  id="description"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Button 
                onClick={startConversation} 
                disabled={!issueCategory || !issueDescription.trim() || isSending}
                className="w-full"
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
          ) : isChatClosed ? (
            // Chat closed state
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Chat Ended</h3>
              <p className="text-muted-foreground mb-6">
                Thanks for chatting with us! We hope we were able to help.
              </p>
              <Button onClick={handleStartNewConversation} size="lg">
                Start New Chat
              </Button>
            </div>
          ) : (
            // Chat interface
            <div className="flex flex-col h-[60vh] sm:h-[70vh]">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* AI Support Notice */}
                  {!isEscalated && (
                    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-primary/5 rounded-lg border border-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        You're chatting with Eclipse AI Support
                      </span>
                    </div>
                  )}
                  {isEscalated && (
                    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <User className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">
                        Connected to human support
                      </span>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : msg.message_type === 'ai_response'
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-muted'
                        }`}
                      >
                        {/* AI Badge for AI responses */}
                        {msg.sender_type === 'agent' && msg.message_type === 'ai_response' && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs text-primary font-medium">AI Support</span>
                          </div>
                        )}
                        {msg.message_type === 'code_verification' && msg.secure_data ? (
                          <CodeVerificationMessage
                            secureData={msg.secure_data}
                            isStaffView={false}
                          />
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap">{parseMessageWithLinks(msg.message, msg.sender_type === 'customer')}</p>
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

                  {/* AI responding indicator */}
                  {isAiResponding && (
                    <div className="flex justify-start">
                      <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary animate-pulse" />
                          <span className="text-sm text-primary">AI is typing</span>
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Human agent typing indicator */}
                  {isAgentTyping && !isAiResponding && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inactivity warning */}
                  {inactivityWarning && (
                    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">
                        Chat will close in 2 minutes due to inactivity
                      </span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Secure code input dialog */}
              <SecureCodeInput
                open={showSecureInput}
                onOpenChange={setShowSecureInput}
                conversationId={conversation.id}
                onSuccess={handleSecureCodeSuccess}
              />

              {/* Input area */}
              <div className="p-4 border-t bg-background">
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
                    onKeyPress={handleKeyPress}
                    onPointerDown={(e) => {
                      // iOS PWA can ignore the first tap; force focus synchronously
                      const input = e.currentTarget;
                      if (document.activeElement === input) return;
                      try {
                        input.focus({ preventScroll: true });
                      } catch {
                        input.focus();
                      }
                    }}
                    onTouchStart={(e) => {
                      const input = e.currentTarget;
                      if (document.activeElement === input) return;
                      try {
                        input.focus({ preventScroll: true });
                      } catch {
                        input.focus();
                      }
                    }}
                    onFocus={() => {
                      // Scroll to bottom when keyboard opens
                      requestAnimationFrame(() => {
                        scrollToBottom();
                        setTimeout(scrollToBottom, 150);
                        setTimeout(scrollToBottom, 350);
                      });
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveChatPage;
