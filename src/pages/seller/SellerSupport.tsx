import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send, Link as LinkIcon, HelpCircle, CreditCard, Package, Settings, FileQuestion, Paperclip, X, Search, Zap } from 'lucide-react';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const TICKET_CATEGORIES = [
  { value: 'account_link_change', label: 'Account Link Change', icon: LinkIcon, description: 'Request to update Discord or Roblox account' },
  { value: 'payout_issue', label: 'Payout Issue', icon: CreditCard, description: 'Problems with payments or withdrawals' },
  { value: 'product_issue', label: 'Product Issue', icon: Package, description: 'Issues with product listings or files' },
  { value: 'technical_support', label: 'Technical Support', icon: Settings, description: 'Technical problems with seller dashboard' },
  { value: 'policy_question', label: 'Policy Question', icon: FileQuestion, description: 'Questions about seller policies or terms' },
  { value: 'other', label: 'Other', icon: HelpCircle, description: 'Other inquiries' },
];

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
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  link_change_type?: string;
  new_discord_username?: string;
  new_roblox_username?: string;
  change_reason?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function SellerSupport() {
  const { user } = useAuth();
  const { store } = useSellerStatus();
  
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [linkChangeType, setLinkChangeType] = useState('');
  const [newDiscordUsername, setNewDiscordUsername] = useState('');
  const [newRobloxUsername, setNewRobloxUsername] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('seller-support-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_support_tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['seller-support-tickets'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_ticket_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['seller-ticket-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['seller-support-tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_support_tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Ticket[];
    },
    enabled: !!user?.id,
  });

  // Fetch messages for selected ticket
  const { data: messages } = useQuery({
    queryKey: ['seller-ticket-messages', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_ticket_messages')
        .select('*')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!selectedTicket?.id,
  });

  // Create ticket mutation
  const createTicket = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const ticketData: any = {
        user_id: user.id,
        store_id: store?.id || null,
        category,
        subject,
        description,
      };
      
      if (category === 'account_link_change') {
        ticketData.link_change_type = linkChangeType;
        ticketData.new_discord_username = linkChangeType !== 'roblox' ? newDiscordUsername : null;
        ticketData.new_roblox_username = linkChangeType !== 'discord' ? newRobloxUsername : null;
        ticketData.change_reason = changeReason;
      }
      
      const { data: ticket, error } = await supabase
        .from('seller_support_tickets')
        .insert(ticketData)
        .select('ticket_number, id')
        .single();
      
      if (error) throw error;

      // Send Discord notification (fire and forget)
      supabase.functions.invoke('send-ticket-notification', {
        body: {
          ticket_number: ticket?.ticket_number,
          subject,
          category,
          customer_name: store?.name || 'Unknown Seller',
          ticket_id: ticket?.id,
          type: 'seller',
        },
      }).catch(err => console.error('Failed to send seller ticket notification:', err));
    },
    onSuccess: () => {
      toast.success('Ticket Created', { description: 'Your support ticket has been submitted.' });
      queryClient.invalidateQueries({ queryKey: ['seller-support-tickets'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedTicket?.id) throw new Error('Invalid state');
      
      let attachmentUrl: string | null = null;
      
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const filePath = `${user.id}/${selectedTicket.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('seller-ticket-attachments')
          .upload(filePath, attachmentFile);
        
        if (uploadError) throw uploadError;
        
        // Store just the file path for signed URL resolution
        attachmentUrl = filePath;
      }
      
      const { error } = await supabase
        .from('seller_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage,
          is_admin: false,
          attachment_url: attachmentUrl,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-ticket-messages', selectedTicket?.id] });
      setNewMessage('');
      setAttachmentFile(null);
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const resetForm = () => {
    setCategory('');
    setSubject('');
    setDescription('');
    setLinkChangeType('');
    setNewDiscordUsername('');
    setNewRobloxUsername('');
    setChangeReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Open</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">In Progress</Badge>;
      case 'awaiting_seller':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">Awaiting Response</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return null;
    }
  };

  const getCategoryIcon = (cat: string) => {
    const found = TICKET_CATEGORIES.find(c => c.value === cat);
    return found?.icon || HelpCircle;
  };

  const getCategoryLabel = (cat: string) => {
    return TICKET_CATEGORIES.find(c => c.value === cat)?.label || cat;
  };

  const filterBySearch = (list: Ticket[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(t => t.subject.toLowerCase().includes(q) || t.ticket_number.toLowerCase().includes(q));
  };

  const openTickets = filterBySearch(tickets?.filter(t => !['resolved', 'closed'].includes(t.status)) || []);
  const closedTickets = filterBySearch(tickets?.filter(t => ['resolved', 'closed'].includes(t.status)) || []);

  return (
    <SellerLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Support</h1>
            <p className="text-sm text-muted-foreground">Get help with your seller account</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue and we'll get back to you as soon as possible
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {category && (
                    <p className="text-xs text-muted-foreground">
                      {TICKET_CATEGORIES.find(c => c.value === category)?.description}
                    </p>
                  )}
                </div>

                {/* Account Link Change specific fields */}
                {category === 'account_link_change' && (
                  <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Which account do you want to change? *</Label>
                      <Select value={linkChangeType} onValueChange={setLinkChangeType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discord">Discord Only</SelectItem>
                          <SelectItem value="roblox">Roblox Only</SelectItem>
                          <SelectItem value="both">Both Accounts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(linkChangeType === 'discord' || linkChangeType === 'both') && (
                      <div className="space-y-2">
                        <Label>New Discord Username *</Label>
                        <Input
                          placeholder="username#0000 or username"
                          value={newDiscordUsername}
                          onChange={(e) => setNewDiscordUsername(e.target.value)}
                        />
                      </div>
                    )}

                    {(linkChangeType === 'roblox' || linkChangeType === 'both') && (
                      <div className="space-y-2">
                        <Label>New Roblox Username *</Label>
                        <Input
                          placeholder="RobloxUsername"
                          value={newRobloxUsername}
                          onChange={(e) => setNewRobloxUsername(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Reason for Change *</Label>
                      <Textarea
                        placeholder="Explain why you need to change your linked account..."
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Brief summary of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Provide as much detail as possible..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createTicket.mutate()}
                  disabled={
                    !category || 
                    !subject.trim() || 
                    !description.trim() ||
                    (category === 'account_link_change' && (
                      !linkChangeType ||
                      !changeReason.trim() ||
                      (linkChangeType !== 'roblox' && !newDiscordUsername.trim()) ||
                      (linkChangeType !== 'discord' && !newRobloxUsername.trim())
                    )) ||
                    createTicket.isPending
                  }
                >
                  {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Inline stats */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{openTickets.length}</span> open
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-orange-500">{tickets?.filter(t => t.status === 'awaiting_seller').length || 0}</span> awaiting response
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-green-500">{closedTickets.length}</span> resolved
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tickets List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile dropdown */}
          <div className="sm:hidden mb-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-auto min-w-[140px] bg-background">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="open">Open ({openTickets.length})</SelectItem>
                <SelectItem value="closed">Closed ({closedTickets.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedTickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-3">
            {openTickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-sm font-medium mb-1">No open tickets</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  You don't have any open support tickets
                </p>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {openTickets.map((ticket) => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    onSelect={() => setSelectedTicket(ticket)}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="closed" className="mt-3">
            {closedTickets.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No closed tickets
              </div>
            ) : (
              <div className="divide-y divide-border">
                {closedTickets.map((ticket) => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    onSelect={() => setSelectedTicket(ticket)}
                    getCategoryIcon={getCategoryIcon}
                    getCategoryLabel={getCategoryLabel}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{selectedTicket.ticket_number}</Badge>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <DialogTitle className="flex items-center gap-2">
                    {(() => { const Icon = getCategoryIcon(selectedTicket.category); return <Icon className="h-5 w-5" />; })()}
                    {selectedTicket.subject}
                  </DialogTitle>
                  <DialogDescription>
                    {getCategoryLabel(selectedTicket.category)} • Created {formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                  {/* Original message */}
                  <div className="border-l-2 border-border pl-3">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    
                    {selectedTicket.category === 'account_link_change' && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Account Link Change Request</p>
                        {selectedTicket.new_discord_username && (
                          <p className="text-sm">New Discord: <span className="font-medium">{selectedTicket.new_discord_username}</span></p>
                        )}
                        {selectedTicket.new_roblox_username && (
                          <p className="text-sm">New Roblox: <span className="font-medium">{selectedTicket.new_roblox_username}</span></p>
                        )}
                        {selectedTicket.change_reason && (
                          <p className="text-sm">Reason: {selectedTicket.change_reason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resolution notes */}
                  {selectedTicket.resolution_notes && (
                    <div className="border-l-2 border-green-500/50 pl-3">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Resolution</p>
                      <p className="text-sm">{selectedTicket.resolution_notes}</p>
                    </div>
                  )}
                  {/* Messages */}
                  <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
                    <div className="space-y-3 pr-4">
                      {messages?.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            msg.is_admin 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-xs font-medium mb-1">
                              {msg.is_admin ? 'Support Team' : 'You'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachment_url && (
                              <div className="mt-2">
                                <AttachmentDisplay
                                  url={msg.attachment_url}
                                  bucket="seller-ticket-attachments"
                                />
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply input */}
                  {!['resolved', 'closed'].includes(selectedTicket.status) && (
                    <div className="space-y-2">
                      {attachmentFile && (
                        <div className="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5">
                          <Paperclip className="h-3 w-3" />
                          <span className="truncate flex-1">{attachmentFile.name}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAttachmentFile(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*,.pdf,.zip,.rar,.txt,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error('File too large', { description: 'Max 10MB' });
                                return;
                              }
                              setAttachmentFile(file);
                            }
                          }}
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && (newMessage.trim() || attachmentFile)) {
                              e.preventDefault();
                              sendMessage.mutate();
                            }
                          }}
                        />
                        <Button 
                          onClick={() => sendMessage.mutate()}
                          disabled={(!newMessage.trim() && !attachmentFile) || sendMessage.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}

interface TicketCardProps {
  ticket: Ticket;
  onSelect: () => void;
  getCategoryIcon: (cat: string) => React.ElementType;
  getCategoryLabel: (cat: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

function TicketCard({ ticket, onSelect, getCategoryIcon, getCategoryLabel, getStatusBadge }: TicketCardProps) {
  const Icon = getCategoryIcon(ticket.category);
  const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
  const isStale = ageHours > 48 && !['resolved', 'closed'].includes(ticket.status);
  
  return (
    <div 
      className="py-3 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors" 
      onClick={onSelect}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{ticket.ticket_number}</Badge>
            {getStatusBadge(ticket.status)}
            {isStale && (
              <span className="text-[10px] text-orange-500 font-medium">⚡ Priority response incoming</span>
            )}
          </div>
          <h3 className="text-sm font-medium truncate">{ticket.subject}</h3>
          <p className="text-xs text-muted-foreground">
            {getCategoryLabel(ticket.category)} · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      {ticket.status === 'awaiting_seller' && (
        <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
      )}
    </div>
  );
}
