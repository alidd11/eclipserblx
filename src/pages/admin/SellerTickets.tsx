import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, User, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {,  formatRelative } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { SellerTicketDrawer } from '@/components/admin/seller-tickets/SellerTicketDrawer';

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

export default function SellerTickets() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const channel = supabase
      .channel('seller-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_support_tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-seller-tickets'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_ticket_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: tickets } = useQuery({
    queryKey: ['admin-seller-tickets'],
    queryFn: async () => {
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('seller_support_tickets')
        .select(`*, stores:store_id (name, store_id)`)
        .not('status', 'in', '("closed","resolved")')
        .order('created_at', { ascending: false });
      if (ticketsError) throw ticketsError;

      const userIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, customer_id, discord_username, roblox_username, avatar_url, created_at')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
      return ticketsData.map(t => ({ ...t, profiles: profilesMap.get(t.user_id) || null })) as Ticket[];
    } });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      open: { label: 'Open', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
      in_progress: { label: 'In Progress', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
      awaiting_seller: { label: 'Awaiting Seller', className: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
      resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-500 border-green-500/30' },
      closed: { label: 'Closed', className: '' } };
    const c = configs[status];
    if (!c) return null;
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') return <Badge variant="destructive">Urgent</Badge>;
    if (priority === 'high') return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">High</Badge>;
    return null;
  };

  const filteredTickets = tickets?.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return !['resolved', 'closed'].includes(t.status);
    if (statusFilter === 'escalated') return !!t.escalated_at && !['resolved', 'closed'].includes(t.status);
    return t.status === statusFilter;
  }) || [];

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (a.escalated_at && !b.escalated_at) return -1;
    if (!a.escalated_at && b.escalated_at) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const openCount = tickets?.filter(t => t.status === 'open').length || 0;
  const inProgressCount = tickets?.filter(t => t.status === 'in_progress').length || 0;
  const awaitingCount = tickets?.filter(t => t.status === 'awaiting_seller').length || 0;
  const escalatedCount = tickets?.filter(t => t.escalated_at && !['resolved', 'closed'].includes(t.status)).length || 0;

  return (
    <AdminLayout requiredPermissions={['view_seller_tickets']}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Seller Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Manage support requests from sellers</p>
        </div>

        <div className="flex items-center gap-4 text-sm flex-wrap">
          {escalatedCount > 0 && <span className="text-destructive font-semibold">{escalatedCount} escalated</span>}
          <span className="text-muted-foreground"><span className="font-semibold text-foreground">{openCount}</span> open</span>
          <span className="text-muted-foreground"><span className="font-semibold text-yellow-500">{inProgressCount}</span> in progress</span>
          <span className="text-muted-foreground"><span className="font-semibold text-orange-500">{awaitingCount}</span> awaiting seller</span>
          <span className="text-muted-foreground"><span className="font-semibold text-muted-foreground">{tickets?.length || 0}</span> total</span>
        </div>

        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[140px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
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

        {sortedTickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-sm font-medium mb-1">No tickets found</h3>
            <p className="text-xs text-muted-foreground">{statusFilter === 'all' ? 'No support tickets yet' : `No ${statusFilter} tickets`}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedTickets.map((ticket) => {
              const slaHours = ticket.last_staff_response_at
                ? (Date.now() - new Date(ticket.last_staff_response_at).getTime()) / (1000 * 60 * 60)
                : (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
              const slaColor = slaHours < 4 ? 'text-green-500' : slaHours < 12 ? 'text-yellow-500' : slaHours < 24 ? 'text-orange-500' : 'text-destructive';

              return (
                <div
                  key={ticket.id}
                  className={cn('py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors', ticket.escalated_at && 'bg-destructive/5')}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                    <AvatarFallback className={cn('text-xs', ticket.escalated_at ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary')}>
                      {ticket.escalated_at ? <AlertTriangle className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">{ticket.ticket_number}</Badge>
                      {ticket.escalated_at && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><AlertTriangle className="h-3 w-3 mr-0.5" />Escalated</Badge>}
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <h3 className="text-sm font-medium line-clamp-1">{ticket.subject}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{ticket.profiles?.display_name || 'Unknown'}</span>
                      {ticket.stores && (<><span>·</span><span>{ticket.stores.name}</span></>)}
                      <span>·</span>
                      <span>{formatRelative(ticket.created_at)}</span>
                      <span>·</span>
                      <span className={cn('font-medium', slaColor)}>SLA: {Math.floor(slaHours)}h</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SellerTicketDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          getStatusBadge={getStatusBadge}
          getPriorityBadge={getPriorityBadge}
        />
      </div>
    </AdminLayout>
  );
}
