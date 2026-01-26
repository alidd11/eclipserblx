import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MessageSquare, Clock, Download, FileText, Ticket, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Navigate, useNavigate } from 'react-router-dom';
import { notifyTicketReply } from '@/lib/pushNotifications';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';

interface Conversation {
  id: string;
  customer_name: string | null;
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

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  sender_type: string;
  sender_id: string | null;
  created_at: string;
  is_internal_note: boolean | null;
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

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  active: 'default',
  waiting: 'outline',
  closed: 'secondary',
  resolved: 'secondary',
};

export default function ChatHistory() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadTickets();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) {
      setConversations(data);
    }
    setIsLoading(false);
  };

  const loadTickets = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data) {
      setTickets(data);
    }
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

  const loadTicketMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true });

    if (data) {
      setTicketMessages(data);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSelectedTicket(null);
    loadMessages(conv.id);
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setSelectedConversation(null);
    loadTicketMessages(ticket.id);
  };

  const generateChatTranscript = () => {
    if (!selectedConversation || messages.length === 0) return;

    const lines: string[] = [
      '='.repeat(60),
      'LIVE CHAT TRANSCRIPT',
      '='.repeat(60),
      '',
      `Category: ${ISSUE_CATEGORY_LABELS[selectedConversation.issue_category || 'other'] || 'General'}`,
      `Date: ${format(new Date(selectedConversation.created_at), 'PPPp')}`,
      `Status: ${selectedConversation.status}`,
      `Conversation ID: ${selectedConversation.id}`,
      '',
      '-'.repeat(60),
      'MESSAGES',
      '-'.repeat(60),
      '',
    ];

    messages.forEach((msg) => {
      const sender = msg.sender_type === 'customer'
        ? 'Customer'
        : msg.sender_type === 'system'
        ? 'System'
        : 'Support Agent';
      const timestamp = format(new Date(msg.created_at), 'PPp');
      lines.push(`[${timestamp}] ${sender}:`);
      lines.push(msg.message);
      if (msg.attachment_url) {
        lines.push(`[Attachment: ${msg.attachment_url}]`);
      }
      lines.push('');
    });

    lines.push('-'.repeat(60));
    lines.push(`Transcript generated on ${format(new Date(), 'PPPp')}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${selectedConversation.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTicketTranscript = () => {
    if (!selectedTicket || ticketMessages.length === 0) return;

    const lines: string[] = [
      '='.repeat(60),
      'SUPPORT TICKET TRANSCRIPT',
      '='.repeat(60),
      '',
      `Subject: ${selectedTicket.subject}`,
      `Date Opened: ${format(new Date(selectedTicket.created_at), 'PPPp')}`,
      `Priority: ${selectedTicket.priority || 'Normal'}`,
      `Status: ${selectedTicket.status}`,
      `Ticket ID: ${selectedTicket.id}`,
      '',
      '-'.repeat(60),
      'MESSAGES',
      '-'.repeat(60),
      '',
    ];

    ticketMessages.forEach((msg) => {
      const sender = msg.sender_type === 'customer' ? 'Customer' : 'Support Agent';
      const timestamp = format(new Date(msg.created_at), 'PPp');
      lines.push(`[${timestamp}] ${sender}:`);
      lines.push(msg.message);
      lines.push('');
    });

    lines.push('-'.repeat(60));
    lines.push(`Transcript generated on ${format(new Date(), 'PPPp')}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-transcript-${selectedTicket.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearSelection = () => {
    setSelectedConversation(null);
    setSelectedTicket(null);
    setMessages([]);
    setTicketMessages([]);
    setReplyMessage('');
  };

  const sendTicketReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !user) return;
    
    // Prevent replies to closed tickets
    if (selectedTicket.status === 'closed') {
      showErrorNotification('Ticket Closed', 'Cannot reply to a closed ticket');
      return;
    }

    const messageText = replyMessage.trim();
    const wasResolved = selectedTicket.status === 'resolved';
    
    setIsSending(true);
    setReplyMessage('');

    try {
      // Insert the reply message
      const { error: msgError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'customer',
          message: messageText,
        });

      if (msgError) throw msgError;

      // If ticket was resolved, re-open it
      if (wasResolved) {
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq('id', selectedTicket.id);

        if (updateError) throw updateError;

        // Update local state
        setSelectedTicket({ ...selectedTicket, status: 'open' });
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'open' } : t
        ));

        // Send push notification to support staff
        notifyTicketReply({
          id: selectedTicket.id,
          subject: selectedTicket.subject,
        });

        showSuccessNotification('Reply Sent!', 'Your ticket has been re-opened');
      } else {
        showSuccessNotification('Reply Sent!', 'Your message has been delivered');
      }

      // Reload messages
      await loadTicketMessages(selectedTicket.id);

      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending reply:', error);
      showErrorNotification('Send Failed', 'Please try again');
      setReplyMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTicketReply();
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-12 flex justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render selected conversation detail
  if (selectedConversation) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {ISSUE_CATEGORY_LABELS[selectedConversation.issue_category || 'other'] || 'Live Chat'}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedConversation.created_at), 'PPP p')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateChatTranscript}
                    disabled={messages.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Transcript
                  </Button>
                  <Badge variant={STATUS_COLORS[selectedConversation.status] || 'secondary'}>
                    {selectedConversation.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4">
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
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.sender_type === 'customer'
                            ? 'You'
                            : msg.sender_type === 'system'
                            ? 'System'
                            : 'Support Agent'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.created_at), 'p')}
                        </span>
                      </div>
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
                        {msg.attachment_url ? (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {msg.message}
                          </a>
                        ) : (
                          msg.message
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Render selected ticket detail
  if (selectedTicket) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelection}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {selectedTicket.subject}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedTicket.created_at), 'PPP p')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateTicketTranscript}
                    disabled={ticketMessages.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Transcript
                  </Button>
                  <Badge variant={STATUS_COLORS[selectedTicket.status] || 'secondary'}>
                    {selectedTicket.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px] p-4">
                {ticketMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages in this ticket yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col',
                          msg.sender_type === 'customer' ? 'items-end' : 'items-start'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {msg.sender_type === 'customer' ? 'You' : 'Support Agent'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.created_at), 'p')}
                          </span>
                        </div>
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                            msg.sender_type === 'customer'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Reply input - only show for non-closed tickets */}
              {selectedTicket.status === 'closed' ? (
                <div className="border-t p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This ticket is closed and cannot receive new replies.
                  </p>
                </div>
              ) : (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={sendTicketReply}
                      disabled={!replyMessage.trim() || isSending}
                      size="icon"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {selectedTicket.status === 'resolved' && (
                    <p className="text-xs text-muted-foreground mt-2">
                      This ticket is resolved. Sending a reply will re-open it.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Render list view with tabs
  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/account')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Support History</h1>
            <p className="text-muted-foreground text-sm">View your past conversations and tickets</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile dropdown */}
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="chats">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Live Chats ({conversations.length})
                  </div>
                </SelectItem>
                <SelectItem value="tickets">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Support Tickets ({tickets.length})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Chats ({conversations.length})
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Support Tickets ({tickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No live chat history yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start a conversation using the chat widget
                  </p>
                </CardContent>
              </Card>
            ) : (
              conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectConversation(conv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {ISSUE_CATEGORY_LABELS[conv.issue_category || 'other'] || 'Support Chat'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <Badge variant={STATUS_COLORS[conv.status] || 'secondary'}>
                        {conv.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No support tickets yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submit a ticket through the support page
                  </p>
                </CardContent>
              </Card>
            ) : (
              tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Ticket className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                            {ticket.priority && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{ticket.priority} priority</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant={STATUS_COLORS[ticket.status] || 'secondary'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
