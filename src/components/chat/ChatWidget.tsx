import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
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

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playSound } = useNotificationSound();

  const openChat = () => {
    console.log('ChatWidget: open');
    setIsMinimized(false);
    setIsOpen(true);
  };

  // Load existing conversation
  useEffect(() => {
    if (user) {
      loadExistingConversation();
    }
  }, [user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
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
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Play sound for agent messages
            if (newMsg.sender_type === 'agent') {
              playSound();
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1);

    if (conversations && conversations.length > 0) {
      const convId = conversations[0].id;
      setConversationId(convId);
      setHasStarted(true);
      loadMessages(convId);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const startConversation = async () => {
    if (!customerName.trim() || !issueCategory) return;

    setIsLoading(true);
    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user?.id || null,
          customer_name: customerName,
          customer_email: customerEmail || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(conversation.id);
      setHasStarted(true);

      // Get the category label
      const categoryLabel = ISSUE_CATEGORIES.find(c => c.value === issueCategory)?.label || issueCategory;

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
          sender_id: user?.id || null,
        });
      }

      loadMessages(conversation.id);
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        message: messageText,
        sender_type: 'customer',
        sender_id: user?.id || null,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
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
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium text-sm">Live Support</span>
        </div>
        <div className="flex items-center gap-1">
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
          {!hasStarted ? (
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
                  <Label htmlFor="chat-name" className="text-xs">Your name *</Label>
                  <Input
                    id="chat-name"
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="chat-email" className="text-xs">Email (optional)</Label>
                  <Input
                    id="chat-email"
                    type="email"
                    placeholder="your@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="chat-issue" className="text-xs">What can we help with? *</Label>
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
                  onClick={startConversation}
                  disabled={!customerName.trim() || !issueCategory || isLoading}
                  className="gradient-button mt-2"
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
                        'flex',
                        msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : msg.sender_type === 'system'
                            ? 'bg-muted text-muted-foreground italic'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="gradient-button"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
