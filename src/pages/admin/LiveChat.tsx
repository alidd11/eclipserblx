import { useState, useEffect, useRef } from 'react';
import { Send, Circle, Paperclip, Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const CANNED_RESPONSES = [
  {
    category: 'Greetings',
    responses: [
      { label: 'Welcome', text: 'Hello! Thank you for reaching out. How can I assist you today?' },
      { label: 'Thanks for waiting', text: 'Thank you for your patience. I\'m here to help you now.' },
    ],
  },
  {
    category: 'Order Issues',
    responses: [
      { label: 'Order status', text: 'I\'d be happy to help you check your order status. Could you please provide your order ID or the email used for the purchase?' },
      { label: 'Processing time', text: 'Orders are typically processed within 24 hours. You\'ll receive a confirmation email once your order is complete.' },
    ],
  },
  {
    category: 'Downloads',
    responses: [
      { label: 'Download help', text: 'To download your purchased items, please go to your Account page and click on "Downloads". If you\'re having trouble, please let me know the specific error you\'re seeing.' },
      { label: 'Download limit', text: 'Each product can be downloaded up to 3 times. If you need additional downloads, please let me know and I can assist you.' },
    ],
  },
  {
    category: 'Refunds',
    responses: [
      { label: 'Refund policy', text: 'Our refund policy allows for refunds within 30 days of purchase for unused digital products. Could you please provide your order details?' },
      { label: 'Refund processing', text: 'Your refund request has been submitted. Refunds typically take 5-7 business days to appear on your statement.' },
    ],
  },
  {
    category: 'Closing',
    responses: [
      { label: 'Anything else', text: 'Is there anything else I can help you with today?' },
      { label: 'Goodbye', text: 'Thank you for contacting us! If you have any other questions, feel free to reach out. Have a great day!' },
    ],
  },
];

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  issue_category: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string | null;
  created_at: string;
  attachment_url: string | null;
}

const ISSUE_CATEGORY_LABELS: Record<string, string> = {
  order: 'Order Issue',
  download: 'Download',
  payment: 'Payment',
  product: 'Product',
  refund: 'Refund',
  technical: 'Technical',
  other: 'Other',
};

const ISSUE_CATEGORY_COLORS: Record<string, string> = {
  order: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  download: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  payment: 'bg-green-500/20 text-green-400 border-green-500/30',
  product: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  refund: 'bg-red-500/20 text-red-400 border-red-500/30',
  technical: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function AdminLiveChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useNotificationSound();

  // Handle agent typing indicator
  const handleTyping = () => {
    if (!selectedConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing status via presence
    const channel = supabase.channel(`typing-${selectedConversation.id}`);
    channel.track({ typing: true, role: 'agent' });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      channel.track({ typing: false, role: 'agent' });
    }, 2000);
  };

  // Load conversations
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('admin-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Subscribe to messages and typing indicator for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    loadMessages(selectedConversation.id);
    setCustomerTyping(false);

    // Messages channel
    const messagesChannel = supabase
      .channel(`admin-chat-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Play sound for customer messages
            if (newMsg.sender_type === 'customer') {
              playSound();
            }
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    // Typing indicator channel
    const typingChannel = supabase
      .channel(`typing-${selectedConversation.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const isTyping = Object.values(state).some((presences: any) =>
          presences.some((p: any) => p.typing && p.role === 'customer')
        );
        setCustomerTyping(isTyping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedConversation?.id]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) {
      setConversations(data);
    }
    setIsLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        message: messageText,
        sender_type: 'agent',
        sender_id: user.id,
      });

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        message: file.name,
        sender_type: 'agent',
        sender_id: user.id,
        attachment_url: publicUrl,
      });

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
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

  const closeConversation = async () => {
    if (!selectedConversation) return;

    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', selectedConversation.id);

    setSelectedConversation(null);
    loadConversations();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertCannedResponse = (text: string) => {
    setNewMessage(text);
  };

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  };

  return (
    <AdminLayout requiredRoles={['admin', 'support_agent']}>
      <div className="h-[calc(100vh-8rem)]">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Live Chat</h1>
          <p className="text-muted-foreground">Respond to customer inquiries in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-5rem)]">
          {/* Conversations List */}
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/50">
              <h2 className="font-semibold">Conversations</h2>
            </div>
            <ScrollArea className="h-[calc(100%-3.5rem)]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No conversations yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                        selectedConversation?.id === conv.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {conv.customer_name || 'Anonymous'}
                        </span>
                        <Badge
                          variant={conv.status === 'open' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {conv.status}
                        </Badge>
                      </div>
                      {conv.issue_category && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] mb-1",
                            ISSUE_CATEGORY_COLORS[conv.issue_category] || ISSUE_CATEGORY_COLORS.other
                          )}
                        >
                          {ISSUE_CATEGORY_LABELS[conv.issue_category] || conv.issue_category}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Circle
                          className={cn(
                            'h-2 w-2 fill-current',
                            conv.status === 'open' ? 'text-green-500' : 'text-gray-400'
                          )}
                        />
                        <span>
                          {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 border border-border rounded-lg bg-card flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-muted/50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {selectedConversation.customer_name || 'Anonymous'}
                      </h3>
                      {selectedConversation.issue_category && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            ISSUE_CATEGORY_COLORS[selectedConversation.issue_category] || ISSUE_CATEGORY_COLORS.other
                          )}
                        >
                          {ISSUE_CATEGORY_LABELS[selectedConversation.issue_category] || selectedConversation.issue_category}
                        </Badge>
                      )}
                    </div>
                    {selectedConversation.customer_email && (
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.customer_email}
                      </p>
                    )}
                  </div>
                  {selectedConversation.status === 'open' && (
                    <Button variant="outline" size="sm" onClick={closeConversation}>
                      Close Chat
                    </Button>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg px-4 py-2',
                            msg.sender_type === 'agent'
                              ? 'bg-primary text-primary-foreground'
                              : msg.sender_type === 'system'
                              ? 'bg-muted text-muted-foreground italic text-sm'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          {msg.attachment_url && (
                            <div className="mb-2">
                              {isImageUrl(msg.attachment_url) ? (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={msg.attachment_url} 
                                    alt="Attachment" 
                                    className="max-w-full rounded max-h-40 object-cover"
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
                          {!msg.attachment_url && <p>{msg.message}</p>}
                          <p
                            className={cn(
                              'text-xs mt-1 opacity-70',
                              msg.sender_type === 'agent'
                                ? 'text-primary-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {customerTyping && (
                            <div className="flex justify-start">
                              <div className="bg-muted text-muted-foreground rounded-lg px-4 py-2 flex items-center gap-1">
                                <span className="text-sm italic">Customer is typing</span>
                                <span className="flex gap-1">
                                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>

                {/* Input */}
                  {selectedConversation.status === 'open' && (
                    <div className="p-4 border-t border-border space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" title="Canned responses">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                            {CANNED_RESPONSES.map((category) => (
                              <div key={category.category}>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  {category.category}
                                </DropdownMenuLabel>
                                {category.responses.map((response) => (
                                  <DropdownMenuItem
                                    key={response.label}
                                    onClick={() => insertCannedResponse(response.text)}
                                    className="cursor-pointer"
                                  >
                                    <span className="truncate">{response.label}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </Button>
                        <Input
                          placeholder="Type your reply..."
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          onKeyPress={handleKeyPress}
                        />
                        <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
