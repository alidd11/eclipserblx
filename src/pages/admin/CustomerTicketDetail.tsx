import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Send, Clock, User, Headphones, Eye, Tag, Mail,
  Paperclip, X, Loader2, MessageSquare, ShoppingBag, ChevronDown,
  Zap, AlertTriangle, UserCheck, Package, CreditCard, History,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: string;
  message: string;
  is_internal_note: boolean | null;
  attachment_url: string | null;
  created_at: string;
}

interface SupportTicket {
  id: string;
  ticket_number: string | null;
  user_id: string | null;
  customer_email: string;
  subject: string;
  status: string;
  priority: string | null;
  category: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  awaiting_customer: { label: 'Awaiting Customer', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
};

const categoryLabels: Record<string, string> = {
  order_issue: 'Order Issue',
  product_question: 'Product Question',
  technical: 'Technical',
  billing: 'Billing',
  refund: 'Refund',
  other: 'Other',
};

const CANNED_RESPONSES = [
  { label: 'Greeting', text: 'Hi there! Thanks for reaching out. I\'d be happy to help you with this.' },
  { label: 'Need more info', text: 'Thanks for your message. Could you please provide more details about the issue so we can assist you better?' },
  { label: 'Order lookup', text: 'I\'m looking into your order now. Please give me a moment to review the details.' },
  { label: 'Issue resolved', text: 'Great news! The issue has been resolved. Please let us know if you need anything else.' },
  { label: 'Refund processing', text: 'Your refund has been initiated. It typically takes 5-10 business days to appear in your account.' },
  { label: 'Escalating', text: 'I\'m escalating this to our senior support team for further investigation. You\'ll receive an update shortly.' },
  { label: 'Follow up', text: 'Just checking in — were you able to resolve the issue? Let us know if you still need help!' },
];

const ATTACHMENT_BUCKET = 'support-ticket-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function CustomerTicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showContext, setShowContext] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Ticket ────────────────────────────────────────────────────────────────
  const { data: ticket, isLoading: loadingTicket } = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data as SupportTicket;
    },
    enabled: !!ticketId,
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['admin-ticket-messages', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });

  // ── Customer profile ──────────────────────────────────────────────────────
  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile', ticket?.user_id],
    queryFn: async () => {
      if (!ticket?.user_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, email, customer_id, created_at, discord_username, roblox_username')
        .eq('user_id', ticket.user_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!ticket?.user_id,
  });

  // ── Customer order history ────────────────────────────────────────────────
  const { data: customerOrders } = useQuery({
    queryKey: ['customer-orders', ticket?.user_id],
    queryFn: async () => {
      if (!ticket?.user_id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('user_id', ticket.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data;
    },
    enabled: !!ticket?.user_id,
  });

  // ── Customer past tickets ─────────────────────────────────────────────────
  const { data: pastTickets } = useQuery({
    queryKey: ['customer-past-tickets', ticket?.user_id, ticketId],
    queryFn: async () => {
      if (!ticket?.user_id) return [];
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, status, created_at')
        .eq('user_id', ticket.user_id)
        .neq('id', ticketId!)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data;
    },
    enabled: !!ticket?.user_id && !!ticketId,
  });

  // ── Assigned staff profile ────────────────────────────────────────────────
  const { data: assignedProfile } = useQuery({
    queryKey: ['assigned-profile', ticket?.assigned_to],
    queryFn: async () => {
      if (!ticket?.assigned_to) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', ticket.assigned_to)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!ticket?.assigned_to,
  });

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`admin-ticket-messages-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, queryClient]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Grouped messages by date ──────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const groups: { date: string; messages: TicketMessage[] }[] = [];
    let currentDate = '';
    for (const msg of messages) {
      const date = format(new Date(msg.created_at), 'MMM d, yyyy');
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async ({ message, isInternal }: { message: string; isInternal: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');

      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `${user.id}/${ticketId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .upload(filePath, attachmentFile);
        if (uploadError) throw uploadError;
        attachmentUrl = filePath;
      }

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: 'staff',
          message: message.trim() || (attachmentUrl ? '\uD83D\uDCCE Attachment' : ''),
          is_internal_note: isInternal,
          attachment_url: attachmentUrl,
        });
      if (error) throw error;

      const newStatus = isInternal ? ticket?.status : 'awaiting_customer';
      await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString(), assigned_to: user.id })
        .eq('id', ticketId);
    },
    onSuccess: () => {
      setNewMessage('');
      setIsInternalNote(false);
      setAttachmentFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
    },
    onError: () => toast.error('Failed to send message'),
  });

  // ── Update status ─────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  // ── Update priority ───────────────────────────────────────────────────────
  const updatePriority = useMutation({
    mutationFn: async (newPriority: string) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      toast.success('Priority updated');
    },
    onError: () => toast.error('Failed to update priority'),
  });

  // ── Claim ticket ──────────────────────────────────────────────────────────
  const claimTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: user?.id, status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      toast.success('Ticket claimed');
    },
    onError: () => toast.error('Failed to claim ticket'),
  });

  const handleSend = () => {
    if (!newMessage.trim() && !attachmentFile) return;
    sendMessage.mutate({ message: newMessage, isInternal: isInternalNote });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', { description: 'Maximum file size is 10MB' });
      return;
    }
    setAttachmentFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertCannedResponse = (text: string) => {
    setNewMessage(prev => prev ? `${prev}\n\n${text}` : text);
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loadingTicket) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[70vh] rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Ticket not found</h1>
          <Button variant="outline" onClick={() => navigate('/admin/customer-tickets')}>Back to Tickets</Button>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const categoryLabel = ticket.category ? categoryLabels[ticket.category] : null;

  return (
    <AdminLayout>
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:p-4">
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div className="rounded-lg border bg-card p-3 space-y-3">
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate('/admin/customer-tickets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>

          <h1 className="text-xl font-bold leading-tight">{ticket.subject}</h1>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">{ticket.ticket_number}</Badge>
            <Badge className={cn('text-xs', status.color)}>{status.label}</Badge>
            {ticket.priority === 'high' && <Badge variant="destructive" className="text-xs">High</Badge>}
            {ticket.priority === 'urgent' && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Urgent</Badge>}
            {categoryLabel && <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {!ticket.assigned_to && (
                <Button size="sm" variant="outline" onClick={() => claimTicket.mutate()} disabled={claimTicket.isPending}>
                  <UserCheck className="h-4 w-4 mr-1" />
                  Claim
                </Button>
              )}

            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={ticket.priority || 'medium'} onValueChange={(v) => updatePriority.mutate(v)}>
                <SelectTrigger className="w-full min-w-0 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)}>
                <SelectTrigger className="w-full min-w-0 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="awaiting_customer">Awaiting Customer</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Main content: conversation + context sidebar ─────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          {/* ── Conversation panel ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div className="border border-border rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 py-3 px-4 border-b">
                <h3 className="font-semibold text-sm text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversation
                  <span className="text-muted-foreground font-normal">({messages?.length || 0} messages)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto md:hidden h-7 px-2 text-xs"
                    onClick={() => setShowContext(!showContext)}
                  >
                    <User className="h-3.5 w-3.5 mr-1" />
                    {showContext ? 'Hide' : 'Context'}
                  </Button>
                </h3>
              </div>

              {/* Messages area */}
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="p-4 space-y-6">
                  {loadingMessages ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet.</p>
                    </div>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.date} className="space-y-4">
                        {/* Date separator */}
                        <div className="flex items-center gap-3">
                          <Separator className="flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{group.date}</span>
                          <Separator className="flex-1" />
                        </div>

                        {group.messages.map((msg) => {
                          const isStaff = msg.sender_type === 'staff';
                          const isInternal = msg.is_internal_note;

                          return (
                            <div key={msg.id} className={cn('flex gap-3', isStaff ? 'flex-row-reverse' : 'flex-row')}>
                              <Avatar className="h-8 w-8 shrink-0 mt-1">
                                {isStaff ? (
                                  <AvatarFallback className="bg-green-500/20 text-green-500">
                                    <Headphones className="h-4 w-4" />
                                  </AvatarFallback>
                                ) : (
                                  <>
                                    <AvatarImage src={customerProfile?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-primary/20 text-primary">
                                      <User className="h-4 w-4" />
                                    </AvatarFallback>
                                  </>
                                )}
                              </Avatar>
                              <div className={cn(
                                'max-w-[80%] rounded-xl px-4 py-2.5',
                                isInternal
                                  ? 'bg-yellow-500/10 border border-yellow-500/30 border-dashed'
                                  : isStaff
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                              )}>
                                <div className={cn(
                                  'text-xs mb-1 flex items-center gap-1.5',
                                  isStaff && !isInternal ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                )}>
                                  {isInternal && <Eye className="h-3 w-3" />}
                                  <span className="font-medium">
                                    {isStaff ? 'Staff' : (customerProfile?.display_name || 'Customer')}
                                  </span>
                                  <span>•</span>
                                  <span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                                  {isInternal && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-500/50 text-yellow-600">Note</Badge>}
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                                {msg.attachment_url && (
                                  <div className="mt-2">
                                    <AttachmentDisplay url={msg.attachment_url} bucket={ATTACHMENT_BUCKET} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply input */}
              <div className="border-t p-4 space-y-3">
                {attachmentFile && (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{attachmentFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAttachmentFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isInternalNote ? 'Add an internal note (staff only)...' : 'Type your reply to the customer...'}
                  className={cn(
                    'min-h-[80px] resize-none',
                    isInternalNote && 'border-yellow-500/30 bg-yellow-500/5'
                  )}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,.pdf,.zip,.rar,.txt,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                      Attach
                    </Button>

                    {/* Canned responses */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Zap className="h-3.5 w-3.5 mr-1.5" />
                          Quick Reply
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Canned Responses</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {CANNED_RESPONSES.map((resp) => (
                          <DropdownMenuItem key={resp.label} onClick={() => insertCannedResponse(resp.text)}>
                            <div>
                              <div className="font-medium text-sm">{resp.label}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[220px]">{resp.text}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="internal"
                        checked={isInternalNote}
                        onCheckedChange={(checked) => setIsInternalNote(!!checked)}
                      />
                      <Label htmlFor="internal" className="text-xs text-muted-foreground cursor-pointer">
                        Internal note
                      </Label>
                    </div>
                  </div>

                  <Button
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !attachmentFile) || sendMessage.isPending}
                    className={isInternalNote ? '' : 'gradient-button'}
                    variant={isInternalNote ? 'outline' : 'default'}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isInternalNote ? 'Add Note' : 'Send Reply'}
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Press Ctrl+Enter to send
                </p>
              </div>
            </div>
          </div>

          {/* ── Context sidebar ────────────────────────────────────────────── */}
          <div className={cn(
            'md:w-80 lg:w-96 space-y-4 shrink-0',
            !showContext && 'hidden md:block'
          )}>
            {/* Customer info */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 py-3 px-4">
                <h3 className="font-semibold text-sm text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </h3>
              </div>
              <div className="p-4 px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={customerProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {customerProfile?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{customerProfile?.display_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      {ticket.customer_email}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Customer ID</span>
                    <p className="font-mono mt-0.5">{customerProfile?.customer_id || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Member since</span>
                    <p className="mt-0.5">{customerProfile?.created_at ? format(new Date(customerProfile.created_at), 'MMM yyyy') : '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discord</span>
                    <p className="mt-0.5 truncate">{customerProfile?.discord_username || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Roblox</span>
                    <p className="mt-0.5 truncate">{customerProfile?.roblox_username || '—'}</p>
                  </div>
                </div>

                {/* Assigned to */}
                {ticket.assigned_to && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-xs">
                      <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Assigned to</span>
                      <span className="font-medium">{assignedProfile?.display_name || 'Staff'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent orders */}
            <Collapsible defaultOpen>
              <div className="border border-border rounded-xl overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center justify-between">
                    <h3 className="font-semibold text-sm text-sm font-medium flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Recent Orders
                      {customerOrders && customerOrders.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{customerOrders.length}</Badge>
                      )}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 px-4 pb-4 space-y-2">
                    {!customerOrders?.length ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No orders found</p>
                    ) : (
                      customerOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                          <div>
                            <span className="font-mono font-medium">{order.id.slice(0, 8)}</span>
                            <p className="text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">&pound;{Number(order.total).toFixed(2)}</span>
                            <Badge variant="outline" className="ml-2 text-[10px] px-1.5 h-4">{order.status}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Past tickets */}
            <Collapsible>
              <div className="border border-border rounded-xl overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 py-3 px-4 flex flex-row items-center justify-between">
                    <h3 className="font-semibold text-sm text-sm font-medium flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Past Tickets
                      {pastTickets && pastTickets.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{pastTickets.length}</Badge>
                      )}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 px-4 pb-4 space-y-2">
                    {!pastTickets?.length ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No past tickets</p>
                    ) : (
                      pastTickets.map((pt) => (
                        <div
                          key={pt.id}
                          className="p-2 rounded-lg bg-muted/50 text-xs cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => navigate(`/admin/customer-tickets/${pt.id}`)}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] px-1 h-4">{pt.ticket_number}</Badge>
                            <Badge className={cn('text-[10px] px-1.5 h-4', statusConfig[pt.status]?.color || '')}>{statusConfig[pt.status]?.label || pt.status}</Badge>
                          </div>
                          <p className="truncate mt-1">{pt.subject}</p>
                          <p className="text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(pt.created_at), { addSuffix: true })}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Ticket meta */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 py-3 px-4">
                <h3 className="font-semibold text-sm text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Ticket Info
                </h3>
              </div>
              <div className="p-4 px-4 pb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last updated</span>
                  <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
                </div>
                {categoryLabel && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span>{categoryLabel}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
