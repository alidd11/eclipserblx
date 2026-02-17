import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Clock, CheckCircle, Send, Link as LinkIcon, User, Store, AlertCircle, XCircle, AlertTriangle, Paperclip, X, FileIcon, Image as ImageIcon } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

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
  };
  stores?: {
    name: string;
    store_id: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  account_link_change: 'Account Link Change',
  payout_issue: 'Payout Issue',
  product_issue: 'Product Issue',
  technical_support: 'Technical Support',
  policy_question: 'Policy Question',
  other: 'Other',
};

export default function SellerTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-seller-tickets'],
    queryFn: async () => {
      // First fetch tickets (exclude closed/resolved - those are in Transcripts)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('seller_support_tickets')
        .select(`
          *,
          stores:store_id (
            name,
            store_id
          )
        `)
        .not('status', 'in', '("closed","resolved")')
        .order('created_at', { ascending: false });
      
      if (ticketsError) throw ticketsError;
      
      // Then fetch profiles for each unique user_id
      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, customer_id, discord_username, roblox_username')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Merge data
      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
      const data = ticketsData.map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || null,
      }));
      
      return data as Ticket[];
    },
  });

  // Fetch messages for selected ticket
  const { data: messages } = useQuery({
    queryKey: ['admin-ticket-messages', selectedTicket?.id],
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
        
        const { data: { publicUrl } } = supabase.storage
          .from('seller-ticket-attachments')
          .getPublicUrl(filePath);
        
        attachmentUrl = publicUrl;
      }
      
      const { error } = await supabase
        .from('seller_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage,
          is_admin: true,
          attachment_url: attachmentUrl,
        });
      
      if (error) throw error;
      
      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('seller_support_tickets')
          .update({ status: 'in_progress', assigned_to: user.id })
          .eq('id', selectedTicket.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      setNewMessage('');
      setAttachmentFile(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!selectedTicket?.id) throw new Error('No ticket selected');
      
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'in_progress' && !selectedTicket.assigned_to) {
        updateData.assigned_to = user?.id;
      }
      
      const { error } = await supabase
        .from('seller_support_tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      toast({ title: 'Status Updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Resolve ticket mutation
  const resolveTicket = useMutation({
    mutationFn: async () => {
      if (!selectedTicket?.id || !user?.id) throw new Error('Invalid state');
      
      const { error } = await supabase
        .from('seller_support_tickets')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedTicket.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      toast({ title: 'Ticket Resolved' });
      setShowResolveDialog(false);
      setResolutionNotes('');
      setSelectedTicket(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Apply account link change
  const applyLinkChange = useMutation({
    mutationFn: async () => {
      if (!selectedTicket?.user_id) throw new Error('No user ID');
      
      const updates: any = {};
      
      if (selectedTicket.new_discord_username) {
        updates.discord_username = selectedTicket.new_discord_username;
        // Note: discord_id would need to be updated separately via verification
      }
      
      if (selectedTicket.new_roblox_username) {
        updates.roblox_username = selectedTicket.new_roblox_username;
        // Note: roblox_user_id would need to be updated separately via verification
      }
      
      if (Object.keys(updates).length === 0) {
        throw new Error('No changes to apply');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', selectedTicket.user_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ 
        title: 'Link Change Applied', 
        description: 'Username(s) updated. User will need to re-verify the account(s).' 
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Open</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">In Progress</Badge>;
      case 'awaiting_seller':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">Awaiting Seller</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">High</Badge>;
      default:
        return null;
    }
  };

  const filteredTickets = tickets?.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return !['resolved', 'closed'].includes(t.status);
    if (statusFilter === 'escalated') return !!t.escalated_at && !['resolved', 'closed'].includes(t.status);
    return t.status === statusFilter;
  }) || [];

  // Sort escalated tickets to the top
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    // Escalated tickets first
    if (a.escalated_at && !b.escalated_at) return -1;
    if (!a.escalated_at && b.escalated_at) return 1;
    // Then by created_at descending
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const openCount = tickets?.filter(t => t.status === 'open').length || 0;
  const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;
  const awaitingCount = tickets?.filter(t => t.status === 'awaiting_seller').length || 0;
  const escalatedCount = tickets?.filter(t => t.escalated_at && !['resolved', 'closed'].includes(t.status)).length || 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_tickets']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Seller Support Tickets</h1>
          <p className="text-muted-foreground">Manage support requests from sellers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {escalatedCount > 0 && (
            <AdminStatCard 
              label="Escalated" 
              value={escalatedCount} 
              valueColor="destructive" 
              subtitle="24h+ no response"
              className="border-destructive bg-destructive/5"
            />
          )}
          <AdminStatCard label="Open" value={openCount} valueColor="blue" />
          <AdminStatCard label="In Progress" value={inProgressCount} valueColor="yellow" />
          <AdminStatCard label="Awaiting Seller" value={awaitingCount} valueColor="orange" />
          <AdminStatCard label="Total" value={tickets?.length || 0} />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="escalated">🔥 Escalated</SelectItem>
              <SelectItem value="open">Open Only</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_seller">Awaiting Seller</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets List */}
        {sortedTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Tickets Found</h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === 'all' ? 'No support tickets yet' : `No ${statusFilter} tickets`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedTickets.map((ticket) => (
              <Card 
                key={ticket.id} 
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  ticket.escalated_at ? 'border-destructive bg-destructive/5' : ''
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        ticket.escalated_at ? 'bg-destructive/20' :
                        ticket.category === 'account_link_change' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {ticket.escalated_at ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : ticket.category === 'account_link_change' ? (
                          <LinkIcon className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">{ticket.ticket_number}</Badge>
                          {ticket.escalated_at && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Escalated
                            </Badge>
                          )}
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <h3 className="font-medium truncate">{ticket.subject}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span>{ticket.profiles?.display_name || 'Unknown'}</span>
                          {ticket.stores && (
                            <>
                              <Store className="h-3 w-3 ml-2" />
                              <span>{ticket.stores.name}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {CATEGORY_LABELS[ticket.category] || ticket.category} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          {ticket.escalated_at && (
                            <span className="text-destructive ml-2">
                              • Escalated {formatDistanceToNow(new Date(ticket.escalated_at), { addSuffix: true })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-3xl max-h-[80dvh] flex flex-col overflow-hidden">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono">{selectedTicket.ticket_number}</Badge>
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <DialogTitle>{selectedTicket.subject}</DialogTitle>
                  <DialogDescription>
                    {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 -mx-6 px-6">
                  {/* Seller Info */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Seller</Label>
                      <p className="font-medium">{selectedTicket.profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.profiles?.email}</p>
                    </div>
                    {selectedTicket.stores && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Store</Label>
                        <p className="font-medium">{selectedTicket.stores.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{selectedTicket.stores.store_id}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Discord</Label>
                      <p className="text-sm">{selectedTicket.profiles?.discord_username || 'Not linked'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Roblox</Label>
                      <p className="text-sm">{selectedTicket.profiles?.roblox_username || 'Not linked'}</p>
                    </div>
                  </div>

                  {/* Original message */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                      
                      {selectedTicket.category === 'account_link_change' && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground">Account Link Change Request</p>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => applyLinkChange.mutate()}
                              disabled={applyLinkChange.isPending}
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Apply Changes
                            </Button>
                          </div>
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
                  <ScrollArea className="flex-1 min-h-[80px] max-h-[30dvh]">
                    <div className="space-y-3 pr-4">
                      {messages?.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            msg.is_admin 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-xs font-medium mb-1">
                              {msg.is_admin ? 'Support Team' : 'Seller'}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            {msg.attachment_url && (
                              <a 
                                href={msg.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                {/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_url) ? (
                                  <>
                                    <ImageIcon className="h-3 w-3" />
                                    <img src={msg.attachment_url} alt="attachment" className="mt-1 max-w-[200px] rounded border" />
                                  </>
                                ) : (
                                  <>
                                    <FileIcon className="h-3 w-3" />
                                    Attachment
                                  </>
                                )}
                              </a>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Actions */}
                  {!['resolved', 'closed'].includes(selectedTicket.status) && (
                    <div className="space-y-3">
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
                                toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' });
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

                      <div className="flex gap-2 flex-wrap">
                        <Select 
                          value={selectedTicket.status} 
                          onValueChange={(val) => updateStatus.mutate(val)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="awaiting_seller">Awaiting Seller</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button 
                          variant="outline" 
                          className="text-green-600"
                          onClick={() => setShowResolveDialog(true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Ticket</DialogTitle>
              <DialogDescription>
                Add resolution notes to close this ticket
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => resolveTicket.mutate()}
                disabled={!resolutionNotes.trim() || resolveTicket.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
