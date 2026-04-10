import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Clock, User, Mail, ShoppingBag, ChevronDown, UserCheck, History,
} from 'lucide-react';
import { formatDistanceToNow, format } formatRelative } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface CustomerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  customer_id: string | null;
  created_at: string | null;
  discord_username: string | null;
  roblox_username: string | null;
}

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

interface PastTicket {
  id: string;
  ticket_number: string | null;
  subject: string;
  status: string;
  created_at: string;
}

interface AssignedProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  awaiting_customer: { label: 'Awaiting Customer', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
};

interface TicketContextSidebarProps {
  ticket: {
    customer_email: string;
    assigned_to: string | null;
    category: string | null;
    created_at: string;
    updated_at: string;
    first_response_at: string | null;
    resolved_at: string | null;
  };
  customerProfile: CustomerProfile | null | undefined;
  customerOrders: OrderSummary[] | undefined;
  pastTickets: PastTicket[] | undefined;
  assignedProfile: AssignedProfile | null | undefined;
  categoryLabel: string | null;
  showContext: boolean;
}

export function TicketContextSidebar({
  ticket, customerProfile, customerOrders, pastTickets,
  assignedProfile, categoryLabel, showContext,
}: TicketContextSidebarProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      'md:w-72 lg:w-80 space-y-3 shrink-0 overflow-y-auto',
      !showContext && 'hidden md:block'
    )}>
      {/* Customer info */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </h3>
        </div>
        <div className="p-4 space-y-3">
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

          <div className="h-px bg-border" />

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

          {ticket.assigned_to && (
            <>
              <div className="h-px bg-border" />
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
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
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
            <div className="p-3 space-y-2">
              {!customerOrders?.length ? (
                <p className="text-xs text-muted-foreground text-center py-3">No orders found</p>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                    <div>
                      <span className="font-mono font-medium">{order.id.slice(0, 8)}</span>
                      <p className="text-muted-foreground mt-0.5">
                        {formatRelative(order.created_at)}
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
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
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
            <div className="p-3 space-y-2">
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
                    <p className="text-muted-foreground mt-0.5">{formatRelative(pt.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Ticket meta */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Ticket Info
          </h3>
        </div>
        <div className="p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last updated</span>
            <span>{formatRelative(ticket.updated_at)}</span>
          </div>
          {categoryLabel && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{categoryLabel}</span>
            </div>
          )}
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Response</span>
            <span className={ticket.first_response_at ? 'text-green-500' : 'text-yellow-500'}>
              {ticket.first_response_at
                ? formatDistanceToNow(new Date(ticket.first_response_at), { addSuffix: false })
                : 'Awaiting'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Resolution Time</span>
            <span className={ticket.resolved_at ? 'text-green-500' : 'text-muted-foreground'}>
              {ticket.resolved_at
                ? formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: false })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}