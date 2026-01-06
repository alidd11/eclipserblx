import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { playSound } = useNotificationSound();

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
    if (!customerName.trim()) return;

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

      // Send welcome message
      await supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        message: `Hi ${customerName}! How can we help you today?`,
        sender_type: 'system',
      });

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
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full gradient-button shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col transition-all duration-200',
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
            <div className="flex-1 p-4 flex flex-col justify-center gap-4">
              <div className="text-center mb-4">
                <h3 className="font-display font-semibold text-lg">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  We typically reply within a few minutes
                </p>
              </div>
              <Input
                placeholder="Your name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Input
                type="email"
                placeholder="Email (optional)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                onClick={startConversation}
                disabled={!customerName.trim() || isLoading}
                className="gradient-button"
              >
                {isLoading ? 'Starting...' : 'Start Chat'}
              </Button>
            </div>
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
