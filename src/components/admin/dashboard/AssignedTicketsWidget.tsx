import { useQuery } from '@tanstack/react-query';
import { Ticket, ChevronRight, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function AssignedTicketsWidget() {
  const { user } = useAuth();

  const { data: assignedTickets } = useQuery({
    queryKey: ['my-assigned-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [customerRes, sellerRes] = await Promise.all([
        supabase
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('assigned_to', user.id)
          .in('status', ['open', 'in_progress', 'awaiting_customer'])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('seller_support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('assigned_to', user.id)
          .in('status', ['open', 'in_progress', 'awaiting_seller'])
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      const customer = (customerRes.data || []).map(t => ({ ...t, type: 'customer' as const }));
      const seller = (sellerRes.data || []).map(t => ({ ...t, type: 'seller' as const }));
      return [...customer, ...seller]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);
    },
    enabled: !!user?.id,
  });

  if (!assignedTickets?.length) return null;

  const statusColors: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-500',
    in_progress: 'bg-blue-500/20 text-blue-500',
    awaiting_customer: 'bg-purple-500/20 text-purple-500',
    awaiting_seller: 'bg-purple-500/20 text-purple-500',
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          Your Assigned Tickets
        </h3>
        <Badge variant="secondary" className="text-xs">{assignedTickets.length}</Badge>
      </div>
      <div className="p-4 space-y-2">
        {assignedTickets.map((ticket) => {
          const href = ticket.type === 'customer'
            ? `/admin/customer-tickets/${ticket.id}`
            : `/admin/seller-tickets/${ticket.id}`;
          return (
            <Link key={ticket.id} to={href}>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_number}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[ticket.status] || 'bg-muted text-muted-foreground'}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                    {(ticket.priority === 'high' || ticket.priority === 'urgent') && (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{ticket.subject}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
