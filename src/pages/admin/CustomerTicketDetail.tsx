import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { TicketContextSidebar } from '@/components/admin/tickets/TicketContextSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Send, Clock, User, Headphones, Eye, Mail,
  Paperclip, X, Loader2, MessageSquare, ShoppingBag, ChevronDown,
  Zap, AlertTriangle, UserCheck, History, AlarmClock, Users,
} from 'lucide-react';
import { formatDistanceToNow, format } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCannedResponses } from '@/components/tickets/useCannedResponses';
import { useAgentCollision } from '@/components/tickets/useAgentCollision';

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
  first_response_at: string | null;
  resolved_at: string | null;
  snoozed_until: string | null;
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

// Canned responses are now loaded from DB via useCannedResponses hook

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
  const { responses: cannedResponses } = useCannedResponses();

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

  // ── Agent collision detection ─────────────────────────────────────────────
  const myProfile = useQuery({
    queryKey: ['my-profile-name', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user!.id).single();
      return data?.display_name || 'Staff';
    },
    enabled: !!user?.id,
  });
  const viewingAgents = useAgentCollision(ticketId, myProfile.data || undefined);

  // ── Snooze ticket ─────────────────────────────────────────────────────────
  const snoozeTicket = useMutation({
    mutationFn: async (hours: number) => {
      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('support_tickets')
        .update({ snoozed_until: snoozedUntil, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ticket snoozed');
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
    },
    onError: () => toast.error('Failed to snooze ticket'),
  });

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

      // Send email notification for non-internal replies
      if (!isInternal && ticket?.customer_email) {
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'ticket-reply',
            to: ticket.customer_email,
            templateData: {
              ticketNumber: ticket.ticket_number || '',
              subject: ticket.subject || 'Your support ticket',
              staffMessage: message.trim().substring(0, 500),
              ticketUrl: `https://roleplay-hub-shop.lovable.app/support/tickets/${ticketId}`,
            },
          },
        }).catch(() => {}); // fire-and-forget
      }
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
      <div className="flex flex-col gap-0 sm:gap-3 p-0 sm:p-3 md:p-4 flex-1 min-h-0 overflow-hidden">
        {/* ── Top bar (compact on mobile) ──────────────────────────────── */}
        <div className="shrink-0 sm:rounded-xl border-b sm:border border-border bg-card px-3 py-2 sm:p-3 space-y-1.5 sm:space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Go back" className="h-8 w-8 shrink-0" onClick={() => navigate('/admin/customer-tickets')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm sm:text-xl font-bold leading-tight truncate flex-1">{ticket.subject}</h1>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <Badge variant="outline" className="font-mono text-[10px] sm:text-[11px] h-5">{ticket.ticket_number}</Badge>
            <Badge className={cn('text-[10px] sm:text-xs h-5', status.color)}>{status.label}</Badge>
            {ticket.priority === 'high' && <Badge variant="destructive" className="text-[10px] h-5">High</Badge>}
            {ticket.priority === 'urgent' && <Badge variant="destructive" className="text-[10px] h-5"><AlertTriangle className="h-3 w-3 mr-0.5" />Urgent</Badge>}
            {categoryLabel && <Badge variant="secondary" className="text-[10px] sm:text-xs h-5">{categoryLabel}</Badge>}
          </div>

          {/* Agent collision banner */}
          {viewingAgents.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              <span className="text-yellow-600">{viewingAgents.map(a => a.name).join(', ')} {viewingAgents.length === 1 ? 'is' : 'are'} also viewing this ticket</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {!ticket.assigned_to && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => claimTicket.mutate()} disabled={claimTicket.isPending}>
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Claim
              </Button>
            )}
            {/* Snooze dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  <AlarmClock className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Snooze</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Snooze ticket for</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => snoozeTicket.mutate(1)}>1 hour</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snoozeTicket.mutate(4)}>4 hours</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snoozeTicket.mutate(24)}>24 hours</DropdownMenuItem>
                <DropdownMenuItem onClick={() => snoozeTicket.mutate(72)}>3 days</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Select value={ticket.priority || 'medium'} onValueChange={(v) => updatePriority.mutate(v)}>
              <SelectTrigger className="w-auto min-w-[90px] sm:min-w-[120px] h-7 sm:h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)}>
              <SelectTrigger className="w-auto min-w-[120px] sm:min-w-[150px] h-7 sm:h-8 text-xs">
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

        {/* ── Main content: conversation + context sidebar ─────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
          {/* ── Conversation panel ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            <div className="border border-border rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 px-4 py-2.5 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
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
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollPaddingBottom: 'calc(var(--chat-safe-bottom, env(safe-area-inset-bottom)) + 10rem)',
                }}
              >
                <div className="p-3 sm:p-4 space-y-5">
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
                      <div key={group.date} className="space-y-3">
                        {/* Date separator */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">{group.date}</span>
                          <div className="flex-1 h-px bg-border" />
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
              <div
                className="shrink-0 border-t border-border bg-card p-2 sm:p-3 space-y-2"
                style={{ paddingBottom: 'max(0.5rem, var(--chat-safe-bottom, env(safe-area-inset-bottom)))' }}
              >
                {attachmentFile && (
                  <div className="flex items-center gap-2 text-xs bg-muted rounded-md px-2 py-1">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{attachmentFile.name}</span>
                    <Button variant="ghost" size="icon" aria-label="Close" className="h-5 w-5" onClick={() => setAttachmentFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isInternalNote ? 'Internal note (staff only)...' : 'Type your reply...'}
                  className={cn(
                    'min-h-[44px] max-h-[80px] sm:max-h-[120px] resize-none text-sm',
                    isInternalNote && 'border-yellow-500/30 bg-yellow-500/5'
                  )}
                  style={{ fontSize: '16px' }}
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,.pdf,.zip,.rar,.txt,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Zap className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Quick Reply</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Canned Responses</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {cannedResponses.map((resp) => (
                          <DropdownMenuItem key={resp.id} onClick={() => insertCannedResponse(resp.body)}>
                            <div>
                              <div className="font-medium text-sm">{resp.title}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[220px]">{resp.body}</div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1">
                      <Checkbox
                        id="internal"
                        checked={isInternalNote}
                        onCheckedChange={(checked) => setIsInternalNote(!!checked)}
                      />
                      <Label htmlFor="internal" className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
                        Note
                      </Label>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !attachmentFile) || sendMessage.isPending}
                    className={cn('h-7 px-3 text-xs', isInternalNote ? '' : 'gradient-button')}
                    variant={isInternalNote ? 'outline' : 'default'}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <TicketContextSidebar
              ticket={ticket}
              customerProfile={customerProfile}
              customerOrders={customerOrders}
              pastTickets={pastTickets}
              assignedProfile={assignedProfile}
              categoryLabel={categoryLabel}
              showContext={showContext}
            />
        </div>
      </div>
    </AdminLayout>
  );
}
