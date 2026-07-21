import { useState, useRef, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Send, Link as LinkIcon, User, Store, AlertTriangle, Paperclip, X, ChevronDown, Zap, Loader2, History, Headphones, Users, CheckCircle } from 'lucide-react';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useCannedResponses } from '@/components/tickets/useCannedResponses';
import { useAgentCollision } from '@/components/tickets/useAgentCollision';

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  user_id: string;
  attachment_url?: string | null;
}

interface Ticket {
  id: string;
  ticket_number: string;
  store_id: string | null;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  link_change_type?: string;
  new_discord_username?: string;
  new_roblox_username?: string;
  change_reason?: string;
  assigned_to?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  escalated_at?: string;
  last_staff_response_at?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    email: string;
    customer_id: string | null;
    discord_username: string | null;
    roblox_username: string | null;
    avatar_url: string | null;
    created_at: string | null;
  };
  stores?: { name: string; store_id: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  account_link_change: 'Account Link Change',
  payout_issue: 'Payout Issue',
  product_issue: 'Product Issue',
  technical_support: 'Technical Support',
  policy_question: 'Policy Question',
  other: 'Other',
};

interface SellerTicketDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityBadge: (priority: string) => React.ReactNode;
}

export function SellerTicketDrawer({ ticket, onClose, getStatusBadge, getPriorityBadge }: SellerTicketDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { responses: cannedResponses } = useCannedResponses();
  const [newMessage, setNewMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myProfile = useQuery({
    queryKey: ['my-profile-name', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user!.id).single();
      return data?.display_name || 'Staff';
    },
    enabled: !!user?.id,
  });
  const viewingAgents = useAgentCollision(ticket?.id, myProfile.data || undefined);

  const { data: messages } = useQuery({
    queryKey: ['admin-ticket-messages', ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return [];
      const { data, error } = await supabase
        .from('seller_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticket?.id,
  });

  const { data: sellerPastTickets } = useQuery({
    queryKey: ['seller-past-tickets', ticket?.user_id, ticket?.id],
    queryFn: async () => {
      if (!ticket?.user_id) return [];
      const { data, error } = await supabase
        .from('seller_support_tickets')
        .select('id, ticket_number, subject, status, created_at')
        .eq('user_id', ticket.user_id)
        .neq('id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return [];
      return data;
    },
    enabled: !!ticket?.user_id,
  });

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

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !ticket?.id) throw new Error('Invalid state');
      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `${user.id}/${ticket.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('seller-ticket-attachments').upload(filePath, attachmentFile);
        if (uploadError) throw uploadError;
        attachmentUrl = filePath;
      }
      const { error } = await supabase.from('seller_ticket_messages').insert({
        ticket_id: ticket.id, user_id: user.id, message: newMessage.trim() || (attachmentUrl ? '📎 Attachment' : ''), is_admin: true, attachment_url: attachmentUrl,
      });
      if (error) throw error;
      if (ticket.status === 'open') {
        await supabase.from('seller_support_tickets').update({ status: 'in_progress', assigned_to: user.id }).eq('id', ticket.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticket?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      setNewMessage('');
      setAttachmentFile(null);
    },
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!ticket?.id) throw new Error('No ticket selected');
      const updateData: Record<string, string> = { status: newStatus };
      if (newStatus === 'in_progress' && !ticket.assigned_to && user?.id) updateData.assigned_to = user.id;
      const { error } = await supabase.from('seller_support_tickets').update(updateData).eq('id', ticket.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] }); toast.success('Status updated'); },
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const updatePriority = useMutation({
    mutationFn: async (newPriority: string) => {
      if (!ticket?.id) throw new Error('No ticket selected');
      const { error } = await supabase.from('seller_support_tickets').update({ priority: newPriority }).eq('id', ticket.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] }); toast.success('Priority updated'); },
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const resolveTicket = useMutation({
    mutationFn: async () => {
      if (!ticket?.id || !user?.id) throw new Error('Invalid state');
      const { error } = await supabase.from('seller_support_tickets')
        .update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_notes: resolutionNotes })
        .eq('id', ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      toast.success('Ticket resolved');
      setShowResolveDialog(false);
      setResolutionNotes('');
      onClose();
    },
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const applyLinkChange = useMutation({
    mutationFn: async () => {
      if (!ticket?.user_id) throw new Error('No user ID');
      const updates: Record<string, string> = {};
      if (ticket.new_discord_username) updates.discord_username = ticket.new_discord_username;
      if (ticket.new_roblox_username) updates.roblox_username = ticket.new_roblox_username;
      if (Object.keys(updates).length === 0) throw new Error('No changes to apply');
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', ticket.user_id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Link change applied', { description: 'User will need to re-verify.' }),
    onError: (error) => toast.error('Error', { description: error.message }),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (newMessage.trim() || attachmentFile)) {
      e.preventDefault();
      sendMessage.mutate();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large', { description: 'Max 10MB' }); return; }
    setAttachmentFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!ticket) return null;

  return (
    <>
      <Drawer open={!!ticket} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[95dvh] flex flex-col">
          {/* Header */}
          <div className="px-4 pt-2 pb-3 border-b space-y-2">
            <DrawerTitle className="text-base leading-tight">{ticket.subject}</DrawerTitle>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{ticket.ticket_number}</Badge>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
              {(CATEGORY_LABELS[ticket.category] || ticket.category) && (
                <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[ticket.category] || ticket.category}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={ticket.priority || 'medium'} onValueChange={(v) => updatePriority.mutate(v)}>
                <SelectTrigger className="w-auto min-w-[90px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DrawerDescription className="sr-only">Ticket details</DrawerDescription>

            {viewingAgents.length > 0 && (
              <div className="flex items-center gap-2 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5">
                <Users className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                <span className="text-yellow-600">{viewingAgents.map(a => a.name).join(', ')} {viewingAgents.length === 1 ? 'is' : 'are'} also viewing this ticket</span>
              </div>
            )}

            {/* Collapsible seller info */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">{ticket.profiles?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{ticket.profiles?.display_name || 'Unknown'}</span>
                {ticket.stores && (<><span className="text-muted-foreground">·</span><Store className="h-3.5 w-3.5" /><span>{ticket.stores.name}</span></>)}
                <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm truncate">{ticket.profiles?.email || '—'}</p></div>
                  {ticket.stores && <div><Label className="text-xs text-muted-foreground">Store ID</Label><p className="text-xs font-mono">{ticket.stores.store_id}</p></div>}
                  <div><Label className="text-xs text-muted-foreground">Discord</Label><p className="text-sm">{ticket.profiles?.discord_username || 'Not linked'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Roblox</Label><p className="text-sm">{ticket.profiles?.roblox_username || 'Not linked'}</p></div>
                  {ticket.profiles?.created_at && <div><Label className="text-xs text-muted-foreground">Member since</Label><p className="text-sm">{format(new Date(ticket.profiles.created_at), 'MMM yyyy')}</p></div>}
                </div>
                {sellerPastTickets && sellerPastTickets.length > 0 && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" />Past Tickets ({sellerPastTickets.length})</p>
                    {sellerPastTickets.map((pt) => (
                      <div key={pt.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-[10px] px-1 h-4">{pt.ticket_number}</Badge>
                          <span className="truncate max-w-[150px]">{pt.subject}</span>
                        </div>
                        {getStatusBadge(pt.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Scrollable content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3 space-y-4">
              <div className="border-l-2 border-border pl-3">
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                {ticket.category === 'account_link_change' && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Account Link Change Request</p>
                      <Button size="sm" variant="outline" onClick={() => applyLinkChange.mutate()} disabled={applyLinkChange.isPending}>
                        <LinkIcon className="h-3 w-3 mr-1" />Apply Changes
                      </Button>
                    </div>
                    {ticket.new_discord_username && <p className="text-sm">New Discord: <span className="font-medium">{ticket.new_discord_username}</span></p>}
                    {ticket.new_roblox_username && <p className="text-sm">New Roblox: <span className="font-medium">{ticket.new_roblox_username}</span></p>}
                    {ticket.change_reason && <p className="text-sm">Reason: {ticket.change_reason}</p>}
                  </div>
                )}
              </div>

              {ticket.resolution_notes && (
                <div className="border-l-2 border-green-500/50 pl-3">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Resolution</p>
                  <p className="text-sm">{ticket.resolution_notes}</p>
                </div>
              )}

              <div className="space-y-4">
                {groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{group.date}</span>
                      <Separator className="flex-1" />
                    </div>
                    {group.messages.map((msg) => (
                      <div key={msg.id} className={cn('flex gap-2.5', msg.is_admin ? 'flex-row-reverse' : 'flex-row')}>
                        <Avatar className="h-7 w-7 shrink-0 mt-1">
                          {msg.is_admin ? (
                            <AvatarFallback className="bg-green-500/20 text-green-500 text-xs"><Headphones className="h-3.5 w-3.5" /></AvatarFallback>
                          ) : (
                            <><AvatarImage src={ticket.profiles?.avatar_url || undefined} /><AvatarFallback className="bg-primary/20 text-primary text-xs"><User className="h-3.5 w-3.5" /></AvatarFallback></>
                          )}
                        </Avatar>
                        <div className={cn('max-w-[80%] rounded-xl px-3.5 py-2.5', msg.is_admin ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                          <div className={cn('text-xs mb-1 flex items-center gap-1.5', msg.is_admin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            <span className="font-medium">{msg.is_admin ? 'Staff' : 'Seller'}</span><span>·</span><span>{format(new Date(msg.created_at), 'h:mm a')}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          {msg.attachment_url && <div className="mt-2"><AttachmentDisplay url={msg.attachment_url} bucket="seller-ticket-attachments" /></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          {!['resolved', 'closed'].includes(ticket.status) && (
            <div className="border-t px-4 py-3 space-y-2">
              {attachmentFile && (
                <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate flex-1">{attachmentFile.name}</span>
                  <Button variant="ghost" size="icon" aria-label="Close" className="h-5 w-5" onClick={() => setAttachmentFile(null)}><X className="h-3 w-3" /></Button>
                </div>
              )}
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.zip,.rar,.txt,.doc,.docx" onChange={handleFileSelect} />
                <Button variant="outline" size="icon" aria-label="Attach file" className="shrink-0" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="shrink-0"><Zap className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Quick Replies</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {cannedResponses.map((resp) => (
                      <DropdownMenuItem key={resp.id} onClick={() => setNewMessage(prev => prev ? `${prev}\n\n${resp.body}` : resp.body)}>
                        <div><div className="font-medium text-sm">{resp.title}</div><div className="text-xs text-muted-foreground truncate max-w-[220px]">{resp.body}</div></div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} />
                <Button onClick={() => sendMessage.mutate()} disabled={(!newMessage.trim() && !attachmentFile) || sendMessage.isPending} className="shrink-0">
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={ticket.status} onValueChange={(val) => updateStatus.mutate(val)}>
                  <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="awaiting_seller">Awaiting Seller</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="text-green-600 h-8" onClick={() => setShowResolveDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-1" />Resolve
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>Add resolution notes to close this ticket</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe how the issue was resolved..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancel</Button>
            <Button onClick={() => resolveTicket.mutate()} disabled={!resolutionNotes.trim() || resolveTicket.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />Resolve Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
