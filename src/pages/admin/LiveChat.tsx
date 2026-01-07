import { useState, useEffect, useRef } from 'react';
import { Send, Circle, Paperclip, Loader2, MessageSquare, ChevronDown, ArrowLeft, Archive } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

const CANNED_RESPONSES = [
  {
    category: 'Greetings',
    responses: [
      { label: 'Welcome', text: 'Hi there! 👋 Thanks for reaching out to Eclipse support. I\'m here to help you with any questions or issues. How can I assist you today?' },
      { label: 'Thanks for waiting', text: 'Thank you so much for your patience! I\'ve reviewed your inquiry and I\'m ready to help you now. Let\'s get this sorted out together.' },
      { label: 'Returning customer', text: 'Welcome back! It\'s great to hear from you again. I can see your previous conversations – how can I help you today?' },
    ],
  },
  {
    category: 'Order Issues',
    responses: [
      { label: 'Order lookup', text: 'I\'d be happy to look into your order for you! Could you please provide either your order ID (starts with "ORD-" or a UUID) or the email address you used when placing the order? This will help me locate it quickly.' },
      { label: 'Order processing', text: 'Great news! Orders are typically processed instantly for digital products. Once payment is confirmed, your downloads become available immediately in your Account → Downloads section. If you\'re not seeing them, please ensure you\'re logged into the same account used for the purchase.' },
      { label: 'Order confirmation', text: 'Your order confirmation email should arrive within a few minutes of purchase. Please check your spam/junk folder if you don\'t see it. The email will contain your order details and a direct link to access your downloads.' },
      { label: 'Order not received', text: 'I\'m sorry to hear you haven\'t received your order. Let me investigate this for you. Can you confirm the email address used for the purchase? I\'ll check our system and make sure everything is properly linked to your account.' },
    ],
  },
  {
    category: 'Downloads',
    responses: [
      { label: 'How to download', text: 'To download your purchased items:\n\n1. Log into your account\n2. Go to Account → Downloads\n3. Click the download button next to your product\n\nIf you\'re having trouble finding it, let me know the product name and I\'ll help locate it.' },
      { label: 'Download not working', text: 'I\'m sorry you\'re experiencing download issues. Let\'s troubleshoot:\n\n• Try a different browser (Chrome/Firefox work best)\n• Disable any ad blockers temporarily\n• Check if your internet connection is stable\n\nIf the issue persists, please let me know the exact error message you\'re seeing.' },
      { label: 'Download limit reached', text: 'I understand you\'ve reached the download limit. Don\'t worry – I can help! For security reasons, we limit downloads to 3 per product. I\'ve reset your download count, so you should now be able to download it again. Please try once more and let me know if it works!' },
      { label: 'File corrupted', text: 'I\'m sorry to hear the file appears corrupted. This can sometimes happen due to incomplete downloads. Here\'s what I recommend:\n\n1. Delete the corrupted file\n2. Clear your browser cache\n3. Try downloading again using a wired connection if possible\n\nIf the issue continues, I\'ll arrange an alternative delivery method for you.' },
    ],
  },
  {
    category: 'Payments',
    responses: [
      { label: 'Payment security', text: 'Your payment security is our top priority! All transactions are processed through Stripe, a PCI Level 1 certified payment provider (the highest security standard). Your card details are encrypted end-to-end and are never stored on our servers. You can pay with confidence!' },
      { label: 'Payment methods', text: 'We offer flexible payment options to suit your needs:\n\n• Credit/Debit Cards (Visa, Mastercard, Amex)\n• Apple Pay & Google Pay\n• Klarna (Buy Now, Pay Later)\n\nAll payment methods are processed securely through Stripe.' },
      { label: 'Payment failed', text: 'I\'m sorry your payment didn\'t go through. Common reasons include:\n\n• Insufficient funds\n• Card security limits triggered\n• Incorrect card details\n\nPlease try again or use a different payment method. If you continue to have issues, your bank may be able to provide more details.' },
      { label: 'Double charged', text: 'I understand how concerning a double charge can be! Let me check our records right away. Could you provide the email used for purchase and the approximate amounts/dates you\'re seeing? If there was indeed an accidental double charge, I\'ll ensure a full refund is processed immediately.' },
    ],
  },
  {
    category: 'Refunds',
    responses: [
      { label: 'Refund policy', text: 'Our refund policy is designed to be fair and straightforward:\n\n• 30-day money-back guarantee on all digital products\n• Refunds are processed within 3-5 business days\n• Full refund provided for unused products\n\nCould you please share your order details so I can start the refund process?' },
      { label: 'Refund initiated', text: 'Great news! I\'ve initiated your refund request. Here\'s what to expect:\n\n• Processing time: 3-5 business days\n• The refund will appear on your original payment method\n• You\'ll receive a confirmation email once it\'s processed\n\nPlease note that some banks may take an additional few days to reflect the credit.' },
      { label: 'Partial refund', text: 'I understand you\'d like a partial refund. I can certainly help with that! To process this accurately, could you let me know:\n\n1. Which specific item(s) you\'d like refunded\n2. The reason for the refund\n\nThis helps us improve our products for everyone.' },
    ],
  },
  {
    category: 'Technical',
    responses: [
      { label: 'Compatibility', text: 'Great question about compatibility! Most of our digital products work with:\n\n• Windows 10/11 and macOS 10.14+\n• Standard software (Photoshop, Illustrator, etc.)\n\nCould you tell me which specific product you\'re asking about? I can provide detailed compatibility information.' },
      { label: 'Installation help', text: 'I\'d be happy to help you install your product! To give you the best guidance:\n\n1. What product did you purchase?\n2. What operating system are you using?\n3. What software will you be using it with?\n\nOnce I have these details, I can walk you through the installation step by step.' },
      { label: 'Product not working', text: 'I\'m sorry you\'re experiencing issues with your product. Let\'s get this resolved! Please share:\n\n• Product name\n• What you\'re trying to do\n• Any error messages you see\n• Screenshots if possible\n\nWith these details, I can provide specific troubleshooting steps.' },
    ],
  },
  {
    category: 'Account',
    responses: [
      { label: 'Password reset', text: 'Need to reset your password? No problem! You can:\n\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your email address\n4. Check your inbox for the reset link\n\nIf you don\'t receive the email within a few minutes, check your spam folder or let me know and I\'ll help.' },
      { label: 'Email change', text: 'I can help you update your email address! For security, I\'ll need to verify your identity first. Could you please confirm:\n\n1. Your current email address\n2. The new email you\'d like to use\n\nOnce verified, I\'ll update your account right away.' },
      { label: 'Account access', text: 'Having trouble accessing your account? Let me help! Please try these steps:\n\n1. Clear your browser cache and cookies\n2. Try the "Forgot Password" option\n3. Ensure you\'re using the correct email\n\nIf you\'re still locked out, I can look into your account directly.' },
    ],
  },
  {
    category: 'Closing',
    responses: [
      { label: 'Anything else', text: 'I\'m glad I could help! Is there anything else I can assist you with today? I\'m happy to answer any other questions you might have.' },
      { label: 'Issue resolved', text: 'Wonderful! I\'m so glad we could get that sorted out for you. 🎉 If you have any questions in the future, don\'t hesitate to reach out. We\'re always here to help!' },
      { label: 'Feedback request', text: 'Thank you for chatting with us today! If you have a moment, we\'d love to hear about your experience. Your feedback helps us improve our support. Have a fantastic day! ✨' },
      { label: 'Goodbye', text: 'Thank you for choosing Eclipse! If you need anything else in the future, we\'re just a message away. Take care and have a wonderful day! 👋' },
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
  const [chatFilter, setChatFilter] = useState<'active' | 'closed'>('active');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playSound } = useNotificationSound();
  const { sendNotification, requestPermission, permission } = usePushNotifications();

  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

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
            // Play sound and send push notification for customer messages
            if (newMsg.sender_type === 'customer') {
              playSound();
              // Send push notification if window is not focused
              if (document.hidden) {
                sendNotification('New customer message', {
                  body: `${selectedConversation.customer_name || 'Customer'}: ${newMsg.message.substring(0, 100)}`,
                  tag: 'admin-chat-message',
                });
              }
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
    if (!selectedConversation || !user) return;

    await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', selectedConversation.id);

    // Log staff activity
    await supabase.from('staff_activity').insert({
      user_id: user.id,
      activity_type: 'chat_completed',
      resource_id: selectedConversation.id,
      resource_type: 'chat_conversation',
      details: { customer_name: selectedConversation.customer_name, customer_email: selectedConversation.customer_email },
    });

    setSelectedConversation(null);
    loadConversations();
  };

  const claimConversation = async (conv: Conversation) => {
    if (!user) return;
    
    setSelectedConversation(conv);
    
    // Log staff activity for claiming
    await supabase.from('staff_activity').insert({
      user_id: user.id,
      activity_type: 'chat_claimed',
      resource_id: conv.id,
      resource_type: 'chat_conversation',
      details: { customer_name: conv.customer_name, customer_email: conv.customer_email },
    });
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
      <div className="h-[calc(100vh-6rem)] flex flex-col">
        <Card className="bg-card border-border mb-4">
          <CardHeader className="pb-2 py-3 lg:py-4">
            <CardTitle className="text-xl sm:text-2xl font-display">Live Chat</CardTitle>
            <p className="text-muted-foreground text-sm">Respond to customer inquiries in real-time</p>
          </CardHeader>
        </Card>

        <div className="h-[calc(100%-5rem)] flex gap-4">
          {/* Conversations List - Hidden on mobile when chat selected */}
          <div className={cn(
            "border border-border rounded-lg bg-card overflow-hidden flex-shrink-0 w-full lg:w-80 xl:w-96",
            selectedConversation ? "hidden lg:block" : "block"
          )}>
            <div className="p-3 lg:p-4 border-b border-border bg-muted/50">
              <Tabs value={chatFilter} onValueChange={(v) => setChatFilter(v as 'active' | 'closed')}>
                <TabsList className="w-full h-8">
                  <TabsTrigger value="active" className="flex-1 text-xs">Active</TabsTrigger>
                  <TabsTrigger value="closed" className="flex-1 text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                    Closed
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : conversations.filter(c => chatFilter === 'active' ? c.status !== 'closed' : c.status === 'closed').length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {chatFilter === 'active' ? 'No active conversations' : 'No closed conversations'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations
                    .filter(c => chatFilter === 'active' ? c.status !== 'closed' : c.status === 'closed')
                    .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => chatFilter === 'active' && conv.status !== 'closed' ? claimConversation(conv) : setSelectedConversation(conv)}
                      className={cn(
                        'w-full p-3 lg:p-4 text-left hover:bg-muted/50 transition-colors touch-manipulation',
                        selectedConversation?.id === conv.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate text-sm lg:text-base">
                          {conv.customer_name || 'Anonymous'}
                        </span>
                        <Badge
                          variant={conv.status !== 'closed' ? 'default' : 'secondary'}
                          className="text-[10px] lg:text-xs"
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
                            conv.status !== 'closed' ? 'text-green-500' : 'text-gray-400'
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

          {/* Chat Area - Full width on mobile, flex-1 on desktop */}
          <div className={cn(
            "border border-border rounded-lg bg-card flex flex-col overflow-hidden flex-1 min-w-0",
            selectedConversation ? "block" : "hidden lg:flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 lg:p-4 border-b border-border bg-muted/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="lg:hidden shrink-0 h-8 w-8"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm lg:text-base truncate">
                          {selectedConversation.customer_name || 'Anonymous'}
                        </h3>
                        {selectedConversation.issue_category && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] lg:text-xs shrink-0",
                              ISSUE_CATEGORY_COLORS[selectedConversation.issue_category] || ISSUE_CATEGORY_COLORS.other
                            )}
                          >
                            {ISSUE_CATEGORY_LABELS[selectedConversation.issue_category] || selectedConversation.issue_category}
                          </Badge>
                        )}
                      </div>
                      {selectedConversation.customer_email && (
                        <p className="text-xs lg:text-sm text-muted-foreground truncate">
                          {selectedConversation.customer_email}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedConversation.status !== 'closed' && (
                    <Button variant="outline" size="sm" onClick={closeConversation} className="shrink-0 text-xs lg:text-sm">
                      Close
                    </Button>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 lg:p-4" ref={scrollRef}>
                  <div className="space-y-3 lg:space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col',
                          msg.sender_type === 'agent' ? 'items-end' : 'items-start'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">
                            {msg.sender_type === 'agent'
                              ? 'You'
                              : msg.sender_type === 'system'
                              ? 'System'
                              : selectedConversation.customer_name || 'Customer'}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            {format(new Date(msg.created_at), 'p')}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'max-w-[85%] lg:max-w-[70%] rounded-lg px-3 py-2 lg:px-4',
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
                          {!msg.attachment_url && <p className="text-sm lg:text-base">{msg.message}</p>}
                        </div>
                      </div>
                    ))}
                    {customerTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 lg:px-4 flex items-center gap-1">
                          <span className="text-xs lg:text-sm italic">Customer is typing</span>
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
                {selectedConversation.status !== 'closed' && (
                  <div className="p-2 lg:p-4 border-t border-border space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <div className="flex gap-1 lg:gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" title="Canned responses" className="h-9 w-9 lg:h-10 lg:w-10 shrink-0">
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
                                  className="cursor-pointer touch-manipulation"
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
                        className="h-9 w-9 lg:h-10 lg:w-10 shrink-0"
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
                        className="text-base"
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()} className="h-9 lg:h-10 shrink-0 px-3">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm lg:text-base p-4 text-center">
                <span className="hidden lg:inline">Select a conversation to start chatting</span>
                <span className="lg:hidden">Tap a conversation to start chatting</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
