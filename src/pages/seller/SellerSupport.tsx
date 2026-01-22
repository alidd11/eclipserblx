import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Send, Link as LinkIcon, HelpCircle, CreditCard, Package, Settings, FileQuestion } from 'lucide-react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // Form state
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [linkChangeType, setLinkChangeType] = useState('');
  const [newDiscordUsername, setNewDiscordUsername] = useState('');
  const [newRobloxUsername, setNewRobloxUsername] = useState('');
  const [changeReason, setChangeReason] = useState('');

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
      
      const { error } = await supabase
        .from('seller_support_tickets')
        .insert(ticketData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Ticket Created', description: 'Your support ticket has been submitted.' });
      queryClient.invalidateQueries({ queryKey: ['seller-support-tickets'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedTicket?.id) throw new Error('Invalid state');
      
      const { error } = await supabase
        .from('seller_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage,
          is_admin: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-ticket-messages', selectedTicket?.id] });
      setNewMessage('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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

  const openTickets = tickets?.filter(t => !['resolved', 'closed'].includes(t.status)) || [];
  const closedTickets = tickets?.filter(t => ['resolved', 'closed'].includes(t.status)) || [];

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Support</h1>
            <p className="text-muted-foreground">Get help with your seller account</p>
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
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4 space-y-4">
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
                    </CardContent>
                  </Card>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Open Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{openTickets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Awaiting Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">
                {tickets?.filter(t => t.status === 'awaiting_seller').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{closedTickets.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({openTickets.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closedTickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4">
            {openTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Open Tickets</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    You don't have any open support tickets
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
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

          <TabsContent value="closed" className="mt-4">
            {closedTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No closed tickets
              </div>
            ) : (
              <div className="space-y-3">
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
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                      
                      {selectedTicket.category === 'account_link_change' && (
                        <div className="mt-4 pt-4 border-t space-y-2">
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
                    </CardContent>
                  </Card>

                  {/* Resolution notes */}
                  {selectedTicket.resolution_notes && (
                    <Card className="bg-green-500/10 border-green-500/30">
                      <CardContent className="pt-4">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">Resolution</p>
                        <p className="text-sm">{selectedTicket.resolution_notes}</p>
                      </CardContent>
                    </Card>
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
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                            e.preventDefault();
                            sendMessage.mutate();
                          }
                        }}
                      />
                      <Button 
                        onClick={() => sendMessage.mutate()}
                        disabled={!newMessage.trim() || sendMessage.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
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
  
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-muted rounded-lg shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">{ticket.ticket_number}</Badge>
                {getStatusBadge(ticket.status)}
              </div>
              <h3 className="font-medium truncate">{ticket.subject}</h3>
              <p className="text-sm text-muted-foreground">
                {getCategoryLabel(ticket.category)} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {ticket.status === 'awaiting_seller' && (
            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
