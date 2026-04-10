import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { notifyNewLiveChat } from '@/lib/pushNotifications';

interface SecureData {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  code_id?: string;
}

export interface LiveChatMessage {
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

const INACTIVITY_WARNING_MS = 3 * 60 * 1000;
const INACTIVITY_CLOSE_MS = 5 * 60 * 1000;

export function useLiveChat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { playSound } = useNotificationSound();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setInactivityWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setInactivityWarning(true);
    }, INACTIVITY_WARNING_MS);

    inactivityTimerRef.current = setTimeout(async () => {
      if (conversation) {
        await supabase
          .from('chat_conversations')
          .update({ status: 'closed' })
          .eq('id', conversation.id);
        setIsChatClosed(true);
      }
    }, INACTIVITY_CLOSE_MS);
  }, [conversation]);

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

  const handleStartNewConversation = useCallback(() => {
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

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

    const mappedMessages: LiveChatMessage[] = (data || []).map(msg => ({
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
          const newMsg = payload.new as LiveChatMessage;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.sender_type === 'agent') {
            playSound('info');
          }
        }
      )
      .subscribe();

    messagesChannelRef.current = channel;

    const typingChannel = supabase
      .channel(`typing-${conversation.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const isTyping = Object.values(state).some((presences) =>
          presences.some((p) => (p as any).typing && (p as any).role === 'agent')
        );
        setIsAgentTyping(isTyping);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      messagesChannelRef.current = null;
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversation?.id, isChatClosed, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle viewport resize for keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let lastHeight = vv.height;
    let timers: number[] = [];

    const handleViewportResize = () => {
      const heightDelta = Math.abs(vv.height - lastHeight);
      if (heightDelta > 50) {
        lastHeight = vv.height;
        timers.forEach(t => clearTimeout(t));
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

  const handleTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    channel.track({ typing: true, role: 'customer' });
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, role: 'customer' });
    }, 2000);
  }, []);

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

      const initialMessage = issueDescription.trim();

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

      notifyNewLiveChat({
        id: newConv.id,
        customer_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Customer',
        issue_category: issueCategory,
      }).catch(err => console.error('Failed to send push notification:', err));

      setIsAiResponding(true);
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat-support', {
          body: {
            conversationId: newConv.id,
            userMessage: initialMessage,
            issueCategory: issueCategory,
            userId: user.id,
          },
        });

        if (aiError) console.error('AI response error:', aiError);
        else if (aiData?.escalated) setIsEscalated(true);
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
    resetInactivityTimer();

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: LiveChatMessage = {
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

      if (!isEscalated) {
        setIsAiResponding(true);
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat-support', {
            body: {
              conversationId: conversation.id,
              userMessage: messageText,
              issueCategory: conversation.issue_category,
              userId: user?.id,
            },
          });

          if (aiError) console.error('AI response error:', aiError);
          else {
            if (aiData?.escalated) setIsEscalated(true);
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
      toast.info('Scanning file for threats...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file);

      if (!scanResult.isAllowed) {
        toast.dismiss('security-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }

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

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          sender_id: user?.id,
          message: `📎 ${file.name}`,
          attachment_url: fileName,
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
    if (conversation) loadMessages(conversation.id);
    setShowSecureInput(false);
  };

  return {
    user,
    authLoading,
    conversation,
    messages,
    newMessage,
    setNewMessage,
    issueCategory,
    setIssueCategory,
    issueDescription,
    setIssueDescription,
    isLoading,
    isSending,
    isUploading,
    showSecureInput,
    setShowSecureInput,
    isAgentTyping,
    isAiResponding,
    isEscalated,
    isChatClosed,
    inactivityWarning,
    messagesEndRef,
    fileInputRef,
    scrollToBottom,
    handleCloseConversation,
    handleStartNewConversation,
    startConversation,
    sendMessage,
    handleFileUpload,
    handleKeyPress,
    handleSecureCodeSuccess,
    handleTyping,
    navigate,
    ISSUE_CATEGORIES,
  };
}

export { ISSUE_CATEGORIES };
