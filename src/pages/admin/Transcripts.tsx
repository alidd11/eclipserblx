import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Inbox, Mail, Ticket, MessageSquare, Flag, Search, 
  ChevronDown, ChevronUp, User, Calendar, Loader2, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TranscriptMessage {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
  sender_name?: string;
}

interface Transcript {
  id: string;
  title: string;
  subtitle?: string;
  created_at: string;
  closed_at?: string;
  customer_name?: string;
  customer_email?: string;
  messages?: TranscriptMessage[];
}

export default function Transcripts() {
  const [activeTab, setActiveTab] = useState('live-chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  // Fetch closed live chat conversations
  const { data: liveChatTranscripts = [], isLoading: liveChatLoading } = useQuery({
    queryKey: ['transcripts-live-chat'],
    queryFn: async () => {
      const { data: conversations, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .in('status', ['closed', 'resolved'])
        .order('updated_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (conversations || []).map(conv => ({
        id: conv.id,
        title: conv.customer_name || conv.customer_email || 'Unknown Customer',
        subtitle: conv.issue_category || 'General Inquiry',
        created_at: conv.created_at,
        closed_at: conv.updated_at,
        customer_name: conv.customer_name,
        customer_email: conv.customer_email,
      })) as Transcript[];
    },
  });

  // Fetch closed discord modmail tickets
  const { data: modmailTranscripts = [], isLoading: modmailLoading } = useQuery({
    queryKey: ['transcripts-modmail'],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('discord_modmail_tickets')
        .select('*')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (tickets || []).map(ticket => ({
        id: ticket.id,
        title: ticket.discord_username,
        subtitle: ticket.subject || 'No subject',
        created_at: ticket.created_at,
        closed_at: ticket.closed_at,
        customer_name: ticket.discord_username,
      })) as Transcript[];
    },
  });

  // Fetch closed seller tickets
  const { data: sellerTicketTranscripts = [], isLoading: sellerTicketsLoading } = useQuery({
    queryKey: ['transcripts-seller-tickets'],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('seller_support_tickets')
        .select('*, stores!inner(name)')
        .in('status', ['closed', 'resolved'])
        .order('resolved_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (tickets || []).map(ticket => ({
        id: ticket.id,
        title: (ticket as any).stores?.name || 'Unknown Store',
        subtitle: `${ticket.ticket_number} - ${ticket.category}`,
        created_at: ticket.created_at,
        closed_at: ticket.resolved_at,
        customer_name: (ticket as any).stores?.name,
      })) as Transcript[];
    },
  });

  // Fetch responded contact messages
  const { data: contactTranscripts = [], isLoading: contactLoading } = useQuery({
    queryKey: ['transcripts-contact'],
    queryFn: async () => {
      const { data: messages, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('status', 'responded')
        .order('responded_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (messages || []).map(msg => ({
        id: msg.id,
        title: msg.name,
        subtitle: msg.subject,
        created_at: msg.created_at,
        closed_at: msg.responded_at,
        customer_name: msg.name,
        customer_email: msg.email,
      })) as Transcript[];
    },
  });

  // Fetch resolved forum reports
  const { data: forumReportTranscripts = [], isLoading: forumReportsLoading } = useQuery({
    queryKey: ['transcripts-forum-reports'],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from('forum_reports')
        .select('*')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (reports || []).map(report => ({
        id: report.id,
        title: `Report: ${report.reason}`,
        subtitle: report.details || 'No details provided',
        created_at: report.created_at,
        closed_at: report.resolved_at,
      })) as Transcript[];
    },
  });

  // Load messages for expanded transcript
  const { data: transcriptMessages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['transcript-messages', expandedTranscript, activeTab],
    queryFn: async () => {
      if (!expandedTranscript) return [];
      
      let messages: TranscriptMessage[] = [];
      
      if (activeTab === 'live-chat') {
        const { data } = await supabase
          .from('chat_messages')
          .select('id, message, sender_type, created_at')
          .eq('conversation_id', expandedTranscript)
          .order('created_at', { ascending: true });
        messages = (data || []).map(m => ({
          ...m,
          sender_name: m.sender_type === 'agent' ? 'Staff' : 'Customer',
        }));
      } else if (activeTab === 'modmail') {
        const { data } = await supabase
          .from('discord_modmail_messages')
          .select('id, content, is_staff_reply, created_at')
          .eq('ticket_id', expandedTranscript)
          .order('created_at', { ascending: true });
        messages = (data || []).map(m => ({
          id: m.id,
          message: m.content,
          sender_type: m.is_staff_reply ? 'staff' : 'user',
          created_at: m.created_at,
          sender_name: m.is_staff_reply ? 'Staff' : 'User',
        }));
      } else if (activeTab === 'seller-tickets') {
        const { data } = await supabase
          .from('seller_ticket_messages')
          .select('id, message, is_admin, created_at')
          .eq('ticket_id', expandedTranscript)
          .order('created_at', { ascending: true });
        messages = (data || []).map(m => ({
          id: m.id,
          message: m.message,
          sender_type: m.is_admin ? 'staff' : 'seller',
          created_at: m.created_at,
          sender_name: m.is_admin ? 'Staff' : 'Seller',
        }));
      } else if (activeTab === 'contact') {
        // For contact messages, get the original message and replies
        const { data: original } = await supabase
          .from('contact_messages')
          .select('id, message, created_at, name')
          .eq('id', expandedTranscript)
          .single();
        
        const { data: replies } = await supabase
          .from('contact_message_replies')
          .select('id, reply_content, sender_type, sent_at')
          .eq('contact_message_id', expandedTranscript)
          .order('sent_at', { ascending: true });
        
        if (original) {
          messages.push({
            id: original.id,
            message: original.message,
            sender_type: 'customer',
            created_at: original.created_at,
            sender_name: original.name,
          });
        }
        
        (replies || []).forEach(r => {
          messages.push({
            id: r.id,
            message: r.reply_content,
            sender_type: r.sender_type,
            created_at: r.sent_at,
            sender_name: r.sender_type === 'staff' ? 'Staff' : 'Customer',
          });
        });
      }
      
      return messages;
    },
    enabled: !!expandedTranscript,
  });

  const filterTranscripts = (transcripts: Transcript[]) => {
    if (!searchQuery) return transcripts;
    const query = searchQuery.toLowerCase();
    return transcripts.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.subtitle?.toLowerCase().includes(query) ||
      t.customer_email?.toLowerCase().includes(query)
    );
  };

  const departments = [
    { id: 'live-chat', label: 'Live Chat', icon: Inbox, count: liveChatTranscripts.length, loading: liveChatLoading },
    { id: 'modmail', label: 'Discord Modmail', icon: Mail, count: modmailTranscripts.length, loading: modmailLoading },
    { id: 'seller-tickets', label: 'Seller Tickets', icon: Ticket, count: sellerTicketTranscripts.length, loading: sellerTicketsLoading },
    { id: 'contact', label: 'Contact Messages', icon: MessageSquare, count: contactTranscripts.length, loading: contactLoading },
    { id: 'forum-reports', label: 'Forum Reports', icon: Flag, count: forumReportTranscripts.length, loading: forumReportsLoading },
  ];

  const getActiveTranscripts = (): Transcript[] => {
    switch (activeTab) {
      case 'live-chat': return filterTranscripts(liveChatTranscripts);
      case 'modmail': return filterTranscripts(modmailTranscripts);
      case 'seller-tickets': return filterTranscripts(sellerTicketTranscripts);
      case 'contact': return filterTranscripts(contactTranscripts);
      case 'forum-reports': return filterTranscripts(forumReportTranscripts);
      default: return [];
    }
  };

  const isLoading = () => {
    switch (activeTab) {
      case 'live-chat': return liveChatLoading;
      case 'modmail': return modmailLoading;
      case 'seller-tickets': return sellerTicketsLoading;
      case 'contact': return contactLoading;
      case 'forum-reports': return forumReportsLoading;
      default: return false;
    }
  };

  const toggleTranscript = (id: string) => {
    setExpandedTranscript(prev => prev === id ? null : id);
  };

  const transcripts = getActiveTranscripts();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Transcripts</h1>
          <p className="text-muted-foreground">View closed conversations and resolved tickets across all departments</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          setExpandedTranscript(null);
        }}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {departments.map((dept) => (
              <TabsTrigger
                key={dept.id}
                value={dept.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <dept.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{dept.label}</span>
                <Badge variant="secondary" className="ml-1">
                  {dept.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : dept.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {departments.map((dept) => (
            <TabsContent key={dept.id} value={dept.id} className="mt-4">
              {isLoading() ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transcripts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p className="font-medium">No closed transcripts</p>
                  <p className="text-sm mt-1">Resolved conversations will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transcripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="bg-card rounded-lg border border-border overflow-hidden"
                    >
                      {/* Transcript Header */}
                      <button
                        onClick={() => toggleTranscript(transcript.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{transcript.title}</p>
                            {transcript.subtitle && (
                              <p className="text-sm text-muted-foreground truncate">{transcript.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(transcript.created_at), 'MMM d, yyyy')}
                            </div>
                            {transcript.closed_at && (
                              <p className="text-xs text-muted-foreground">
                                Closed: {format(new Date(transcript.closed_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Closed
                          </Badge>
                          {expandedTranscript === transcript.id ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Messages */}
                      {expandedTranscript === transcript.id && (
                        <div className="border-t border-border">
                          {transcript.customer_email && (
                            <div className="px-4 py-2 bg-muted/30 text-sm text-muted-foreground border-b border-border">
                              Email: {transcript.customer_email}
                            </div>
                          )}
                          <ScrollArea className="h-[300px]">
                            <div className="p-4">
                              {messagesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : transcriptMessages.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No messages found</p>
                              ) : (
                                <div>
                                  {transcriptMessages.map((msg, index) => {
                                    const prevMsg = index > 0 ? transcriptMessages[index - 1] : null;
                                    const isGrouped = prevMsg && prevMsg.sender_type === msg.sender_type;
                                    const isStaff = msg.sender_type === 'agent' || msg.sender_type === 'staff';
                                    
                                    return (
                                      <div
                                        key={msg.id}
                                        className={cn(
                                          'flex flex-col',
                                          isStaff ? 'items-end' : 'items-start',
                                          isGrouped ? 'mt-0.5' : index > 0 ? 'mt-4' : ''
                                        )}
                                      >
                                        {!isGrouped && (
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-muted-foreground">
                                              {msg.sender_name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/70">
                                              {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                                            </span>
                                          </div>
                                        )}
                                        <div
                                          className={cn(
                                            'max-w-[80%] rounded-lg px-3 py-2',
                                            isStaff
                                              ? 'bg-primary text-primary-foreground'
                                              : 'bg-muted text-foreground'
                                          )}
                                        >
                                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
