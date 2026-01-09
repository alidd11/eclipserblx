import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Paperclip, Loader2, History, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { notifyNewLiveChat, notifyNewChatMessage } from '@/lib/pushNotifications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

type MessageStatus = 'pending' | 'sent' | 'failed';

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string | null;
  created_at: string;
  attachment_url?: string | null;
  // Optimistic UI fields (not in DB)
  _status?: MessageStatus;
  _tempId?: string;
}

const ISSUE_CATEGORIES = [
  { value: 'order', label: 'Order Issue' },
  { value: 'download', label: 'Download Problem' },
  { value: 'payment', label: 'Payment & Billing' },
  { value: 'product', label: 'Product Question' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'other', label: 'Other' },
];

// Check if support is online (Mon-Fri 9am-9pm, Sat 9am-8pm, offline Sunday)
const isSupportOnline = (): boolean => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = now.getHours();
  
  // Offline all day Sunday
  if (day === 0) return false;
  
  // Saturday: 9am to 8pm
  if (day === 6) return hour >= 9 && hour < 20;
  
  // Mon-Fri: 9am to 9pm
  return hour >= 9 && hour < 21;
};

const SUPPORT_HOURS = [
  { day: 'Monday', hours: '9:00 AM - 9:00 PM' },
  { day: 'Tuesday', hours: '9:00 AM - 9:00 PM' },
  { day: 'Wednesday', hours: '9:00 AM - 9:00 PM' },
  { day: 'Thursday', hours: '9:00 AM - 9:00 PM' },
  { day: 'Friday', hours: '9:00 AM - 9:00 PM' },
  { day: 'Saturday', hours: '9:00 AM - 8:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

export function ChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hide the chat widget on admin pages
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<string>('active');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueCategory, setIssueCategory] = useState('other');
  const [issueDescription, setIssueDescription] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(isSupportOnline());
  const [messagesChannelStatus, setMessagesChannelStatus] = useState<string>('');
  const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);
  const [realtimeNonce, setRealtimeNonce] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);
  const messagesRetryRef = useRef<{ attempt: number; timeoutId: ReturnType<typeof setTimeout> | null }>({
    attempt: 0,
    timeoutId: null,
  });

  const { playSound } = useNotificationSound();
  const { sendNotification, requestPermission, permission } = usePushNotifications();

  // Update online status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsOnline(isSupportOnline());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle customer typing indicator
  const handleTyping = () => {
    if (!conversationId) return;

    const channel = typingChannelRef.current;
    if (!channel) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status via presence (reuse the subscribed channel)
    channel.track({ typing: true, role: 'customer' });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, role: 'customer' });
    }, 2000);
  };

  const openChat = () => {
    console.log('ChatWidget: open');
    setIsMinimized(false);
    setIsOpen(true);
  };

  // Load user's profile display name
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCustomerName(data.display_name || data.email?.split('@')[0] || '');
          }
        });
    }
  }, [user]);

  // Load existing conversation
  useEffect(() => {
    if (user) {
      loadExistingConversation();
    }
  }, [user]);

  // Request push notification permission when chat starts
  useEffect(() => {
    if (hasStarted && permission === 'default') {
      requestPermission();
    }
  }, [hasStarted, permission, requestPermission]);

  // Subscribe to new messages, typing indicator, and conversation status
  useEffect(() => {
    if (!conversationId) return;

    setMessagesChannelStatus('CONNECTING');
    messagesRetryRef.current.attempt = 0;
    if (messagesRetryRef.current.timeoutId) {
      clearTimeout(messagesRetryRef.current.timeoutId);
      messagesRetryRef.current.timeoutId = null;
    }

    const scheduleRetry = (status: string) => {
      if (status !== 'TIMED_OUT' && status !== 'CHANNEL_ERROR') return;
      if (messagesRetryRef.current.timeoutId) return;

      const attempt = messagesRetryRef.current.attempt + 1;
      messagesRetryRef.current.attempt = attempt;
      const delayMs = Math.min(30000, 1000 * 2 ** (attempt - 1));

      messagesRetryRef.current.timeoutId = setTimeout(() => {
        messagesRetryRef.current.timeoutId = null;
        setRealtimeNonce((n) => n + 1);
      }, delayMs);
    };

    // Messages channel
    const messagesChannel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Check if this is reconciling an optimistic message
            const optimisticIdx = prev.findIndex(
              (m) => m._tempId && m.message === newMsg.message && m.sender_type === newMsg.sender_type
            );
            if (optimisticIdx !== -1) {
              // Replace optimistic message with real one
              const updated = [...prev];
              updated[optimisticIdx] = { ...newMsg, _status: 'sent' };
              return updated;
            }
            // Dedupe by id
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Play sound and send push notification for agent messages
            if (newMsg.sender_type === 'agent') {
              playSound();
              // Send push notification if window is not focused
              if (document.hidden) {
                sendNotification('New message from Support', {
                  body: newMsg.message.substring(0, 100),
                  tag: 'chat-message',
                });
              }
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe((status) => {
        console.log('ChatWidget messagesChannel status:', status);
        setMessagesChannelStatus(status);

        if (status === 'SUBSCRIBED') {
          messagesRetryRef.current.attempt = 0;
          if (messagesRetryRef.current.timeoutId) {
            clearTimeout(messagesRetryRef.current.timeoutId);
            messagesRetryRef.current.timeoutId = null;
          }
        } else {
          scheduleRetry(status);
        }
      });

    // Conversation status channel - detect when staff closes the chat
    const conversationChannel = supabase
      .channel(`conversation-status-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          setConversationStatus(updated.status);
          if (updated.status === 'closed') {
            playSound();
            sendNotification('Chat closed', {
              body: 'This conversation has been closed by support.',
              tag: 'chat-closed',
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('ChatWidget conversationChannel status:', status);
      });

    // Typing indicator channel
    const typingChannel = supabase
      .channel(`typing-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const isTyping = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.typing && p.role === 'agent')
        );
        setAgentTyping(isTyping);
      })
      .subscribe((status) => {
        console.log('ChatWidget typingChannel status:', status);
      });

    // Reuse this single presence channel for outgoing typing events
    typingChannelRef.current = typingChannel;

    return () => {
      typingChannelRef.current = null;
      if (messagesRetryRef.current.timeoutId) {
        clearTimeout(messagesRetryRef.current.timeoutId);
        messagesRetryRef.current.timeoutId = null;
      }
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, realtimeNonce]);

  // Fallback polling while realtime is not fully subscribed
  useEffect(() => {
    if (!conversationId) return;
    if (messagesChannelStatus === 'SUBSCRIBED') return;

    const interval = setInterval(() => {
      loadMessages(conversationId);
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, messagesChannelStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadExistingConversation = async () => {
    if (!user) return;

    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'waiting'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (conversations && conversations.length > 0) {
      const convId = conversations[0].id;
      setConversationId(convId);
      setHasStarted(true);
      loadMessages(convId);
    }
  };

  const mergeServerMessages = (prev: Message[], server: Message[]) => {
    // Server is source-of-truth, but never "drop" very recent local messages
    // (can happen during polling/reconnect while inserts haven't surfaced yet).
    const merged: Message[] = [...server];
    const byId = new Set(merged.map((m) => m.id));

    const now = Date.now();
    const keepLocalMs = 2 * 60 * 1000; // 2 minutes safety window

    for (const local of prev) {
      if (byId.has(local.id)) continue;

      const isOptimistic = local._status === 'pending' || local._status === 'failed' || !!local._tempId;
      const isRecent = now - new Date(local.created_at).getTime() < keepLocalMs;

      if (isOptimistic || isRecent) {
        merged.push(local);
        byId.add(local.id);
      }
    }

    merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return merged;
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages((prev) => mergeServerMessages(prev, data as Message[]));
    }
  };

  const refreshMessages = async () => {
    if (!conversationId) return;
    setIsRefreshingMessages(true);
    try {
      await loadMessages(conversationId);
    } finally {
      setIsRefreshingMessages(false);
    }
  };

  const startConversation = async () => {
    if (!customerName.trim() || !issueCategory) return;

    // Live chat requires authentication (RLS enforces user-scoped access)
    if (!user) {
      alert('Please sign in to start live chat.');
      window.location.href = '/auth';
      return;
    }

    setIsLoading(true);
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          customer_name: customerName,
          customer_email: customerEmail || null,
          status: 'active',
          issue_category: issueCategory,
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(conversation.id);
      setHasStarted(true);

      // Get the category label
      const categoryLabel = ISSUE_CATEGORIES.find((c) => c.value === issueCategory)?.label || issueCategory;

      // Send welcome message with issue context
      await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        message: `Hi ${customerName}! Thanks for reaching out about: ${categoryLabel}. How can we help you today?`,
        sender_type: 'system',
      });

      // If customer provided an initial description, send it as their first message
      if (issueDescription.trim()) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversation.id,
          message: `[${categoryLabel}] ${issueDescription.trim()}`,
          sender_type: 'customer',
          sender_id: user.id,
        });
      }

      // Notify support agents via push notification
      notifyNewLiveChat({
        id: conversation.id,
        customer_name: customerName,
        issue_category: issueCategory,
      });

      loadMessages(conversation.id);
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Could not start chat. Please try again (or sign in again).');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    // Reset state to show the start form again
    setConversationId(null);
    setConversationStatus('active');
    setHasStarted(false);
    setMessages([]);
    setCustomerName('');
    setCustomerEmail('');
    setIssueCategory('other');
    setIssueDescription('');
    setNewMessage('');
  };

  const sendMessage = async (retryTempId?: string) => {
    let messageText: string;
    let tempId: string;

    if (retryTempId) {
      // Retry a failed message
      const failedMsg = messages.find((m) => m._tempId === retryTempId);
      if (!failedMsg) return;
      messageText = failedMsg.message;
      tempId = retryTempId;
      // Mark as pending
      setMessages((prev) =>
        prev.map((m) => (m._tempId === tempId ? { ...m, _status: 'pending' } : m))
      );
    } else {
      // New message
      if (!newMessage.trim() || !conversationId || conversationStatus === 'closed') return;
      messageText = newMessage.trim();
      tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setNewMessage('');

      // Optimistically add message
      const optimisticMsg: Message = {
        id: tempId,
        message: messageText,
        sender_type: 'customer',
        sender_id: user?.id || null,
        created_at: new Date().toISOString(),
        _status: 'pending',
        _tempId: tempId,
      };
      setMessages((prev) => [...prev, optimisticMsg]);
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          message: messageText,
          sender_type: 'customer',
          sender_id: user?.id || null,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      if (data) {
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...data, _status: 'sent' } : m))
        );
      }

      // Notify support agents via push notification
      await notifyNewChatMessage(conversationId!, customerName, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => (m._tempId === tempId ? { ...m, _status: 'failed' } : m))
      );
    }
  };

  const removeFailedMessage = (tempId: string) => {
    setMessages((prev) => prev.filter((m) => m._tempId !== tempId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send message with attachment
      const { data: inserted, error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          message: file.name,
          sender_type: 'customer',
          sender_id: user?.id || null,
          attachment_url: publicUrl,
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      if (inserted) {
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      }

      // Notify support agents via push notification
      await notifyNewChatMessage(conversationId, customerName, `[Attachment] ${file.name}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasStarted) {
        sendMessage();
      } else {
        startConversation();
      }
    }
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  // Don't render anything on admin routes
  if (isAdminRoute) {
    return null;
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        onClick={openChat}
        onTouchEnd={(e) => {
          // iOS Safari: ensure touch reliably opens the widget
          e.preventDefault();
          openChat();
        }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full gradient-button shadow-lg z-[9999] touch-manipulation cursor-pointer"
        size="icon"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-[9999] flex flex-col transition-all duration-200',
        isMinimized ? 'h-14' : 'h-[500px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-3 w-3 rounded-full",
            isOnline ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
          )} />
          <span className="font-medium text-sm">
            {isOnline ? 'Live Support' : 'Support Offline'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsOpen(false);
                navigate('/chat-history');
              }}
              title="View chat history"
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {!isOnline && !hasStarted ? (
            /* Offline Message */
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm">Support Offline</h3>
                    <p className="text-xs text-muted-foreground">We'll be back during business hours</p>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 mb-4">
                  <h4 className="text-xs font-medium mb-2">Business Hours</h4>
                  <div className="space-y-1">
                    {SUPPORT_HOURS.map((item, index) => {
                      // Map index to day of week (0 = Monday in our array, but JS uses 0 = Sunday)
                      const currentDay = new Date().getDay();
                      const itemDayIndex = index === 6 ? 0 : index + 1; // Convert our array index to JS day
                      const isToday = currentDay === itemDayIndex;
                      
                      return (
                        <div 
                          key={item.day} 
                          className={cn(
                            "flex justify-between text-xs py-0.5 px-1 rounded",
                            isToday && "bg-primary/10"
                          )}
                        >
                          <span className={isToday ? "text-primary font-medium" : "text-muted-foreground"}>
                            {item.day}
                          </span>
                          <span className={cn(
                            item.hours === 'Closed' ? 'text-muted-foreground' : 'text-foreground font-medium',
                            isToday && "text-primary"
                          )}>
                            {item.hours}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <a href="/faq" className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-primary hover:underline font-medium py-2 px-3 rounded-md bg-primary/10">
                    View FAQ
                  </a>
                  <a href="/forum" className="flex-1 inline-flex items-center justify-center gap-1 text-xs text-primary hover:underline font-medium py-2 px-3 rounded-md bg-primary/10">
                    Submit Ticket
                  </a>
                </div>
              </div>
            </ScrollArea>
          ) : !hasStarted ? (
            /* Start Form */
            <ScrollArea className="flex-1">
              <div className="p-4 flex flex-col gap-3">
                <div className="text-center mb-2">
                  <h3 className="font-display font-semibold text-lg">Start a conversation</h3>
                  <p className="text-xs text-muted-foreground">
                    We typically reply within a few minutes
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="chat-name" className="text-xs">Display Name</Label>
                  <Input
                    id="chat-name"
                    value={customerName}
                    readOnly
                    disabled
                    className="h-9 bg-muted/50 cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="chat-issue" className="text-xs">What can we help with?</Label>
                  <Select value={issueCategory} onValueChange={setIssueCategory}>
                    <SelectTrigger id="chat-issue" className="h-9 bg-background">
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-[10000]">
                      {ISSUE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="chat-description" className="text-xs">Describe your issue (optional)</Label>
                  <Textarea
                    id="chat-description"
                    placeholder="Tell us more about your issue..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
                
                <Button
                  type="button"
                  onClick={startConversation}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    if (customerName.trim() && issueCategory && !isLoading) {
                      startConversation();
                    }
                  }}
                  disabled={!customerName.trim() || !issueCategory || isLoading}
                  className="gradient-button mt-2 touch-manipulation"
                >
                  {isLoading ? 'Starting...' : 'Start Chat'}
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col',
                        msg.sender_type === 'customer' ? 'items-end' : 'items-start'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {msg.sender_type === 'customer'
                            ? 'You'
                            : msg.sender_type === 'system'
                            ? 'System'
                            : 'Support Agent'}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {format(new Date(msg.created_at), 'p')}
                        </span>
                        {msg._status === 'pending' && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        {msg._status === 'failed' && (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : msg.sender_type === 'system'
                            ? 'bg-muted text-muted-foreground italic'
                            : 'bg-muted text-foreground',
                          msg._status === 'pending' && 'opacity-70',
                          msg._status === 'failed' && 'bg-destructive/20 border border-destructive/40'
                        )}
                      >
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {isImageUrl(msg.attachment_url) ? (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={msg.attachment_url} 
                                  alt="Attachment" 
                                  className="max-w-full rounded max-h-32 object-cover"
                                />
                              </a>
                            ) : (
                              <a 
                                href={msg.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs underline"
                              >
                                <Paperclip className="h-3 w-3" />
                                {msg.message}
                              </a>
                            )}
                          </div>
                        )}
                        {!msg.attachment_url && msg.message}
                      </div>
                      {/* Retry/Remove for failed messages */}
                      {msg._status === 'failed' && msg._tempId && (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => sendMessage(msg._tempId)}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                          <button
                            onClick={() => removeFailedMessage(msg._tempId!)}
                            className="text-[10px] text-muted-foreground hover:text-destructive"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                    {agentTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 flex items-center gap-1">
                          <span className="text-xs italic">Agent is typing</span>
                          <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

              {/* Input or Closed State */}
              {conversationStatus === 'closed' ? (
                <div className="p-4 border-t border-border bg-muted/50">
                  <div className="text-center space-y-3">
                    <div className="text-sm text-muted-foreground">
                      This conversation has been closed.
                    </div>
                    <Button
                      onClick={startNewChat}
                      className="gradient-button w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-border">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-shrink-0"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={handleKeyPress}
                    />
                    <Button
                      size="icon"
                      onClick={() => sendMessage()}
                      disabled={!newMessage.trim()}
                      className="gradient-button"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
