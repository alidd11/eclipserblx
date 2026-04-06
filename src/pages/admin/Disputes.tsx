import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, Search, Eye, Loader2, Shield, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import type { EnrichedDispute, DisputeTicket } from './disputes/disputeTypes';
import { statusConfig, getDeadlineInfo, getEscrowBadge, getDeadlineBadge, PAGE_SIZE } from './disputes/disputeHelpers';
import { DisputeDetailDialog } from './disputes/DisputeDetailDialog';

export default function Disputes() {
  const isInsideHub = useIsInsideHub();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<EnrichedDispute | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [page, setPage] = useState(0);

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('refund_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const customerIds = [...new Set((data || []).map((r) => r.customer_id))];
      const storeIds = [...new Set((data || []).map((r) => r.store_id).filter(Boolean))];
      const orderIds = [...new Set((data || []).map((r) => r.order_id).filter(Boolean))];

      const [profilesRes, storesRes, escrowRes, ticketsRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from('profiles').select('user_id, display_name, username, email, customer_id').in('user_id', customerIds)
          : { data: [] },
        storeIds.length > 0
          ? supabase.from('stores').select('id, name, store_id').in('id', storeIds)
          : { data: [] },
        orderIds.length > 0
          ? supabase.from('seller_transactions').select('order_id, escrow_hold_until, escrow_released_at, escrow_frozen').in('order_id', orderIds)
          : { data: [] },
        orderIds.length > 0
          ? supabase.from('support_tickets').select('id, ticket_number, subject, status, category')
            .eq('category', 'refund')
            .order('created_at', { ascending: false })
            .limit(100)
          : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p]));
      const storeMap = Object.fromEntries((storesRes.data || []).map((s) => [s.id, s]));
      const escrowMap = Object.fromEntries((escrowRes.data || []).map((e) => [e.order_id, e]));
      const ticketsBySubject = (ticketsRes.data || []) as DisputeTicket[];

      return (data || []).map((r) => {
        const linkedTicket = ticketsBySubject.find((t) => 
          t.subject?.includes(r.order_id?.substring(0, 8))
        );
        return {
          ...r,
          customer: profileMap[r.customer_id] || null,
          store: storeMap[r.store_id] || null,
          escrow: escrowMap[r.order_id] || null,
          linkedTicket: linkedTicket || null,
        };
      });
    },
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, status, response, customerId }: { id: string; status: string; response: string; customerId?: string }) => {
      const updateData: Record<string, unknown> = {
        status,
        admin_response: response || null,
        updated_at: new Date().toISOString(),
      };
      if (status === 'resolved' || status === 'approved' || status === 'denied') {
        updateData.admin_resolved_at = new Date().toISOString();
        updateData.admin_resolved_by = (await supabase.auth.getUser()).data.user?.id;
      }
      const { error } = await supabase.from('refund_requests').update(updateData).eq('id', id);
      if (error) throw error;

      if (customerId && ['resolved', 'approved', 'denied'].includes(status)) {
        const statusText = status === 'approved' ? 'approved — your refund will be processed' : status === 'denied' ? 'denied by our team' : 'resolved by our team';
        await supabase.from('notifications').insert({
          user_id: customerId,
          type: 'order_update',
          title: `Dispute ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: `Your dispute has been ${statusText}.`,
          link: '/account/orders',
        });

        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_ids: [customerId],
              payload: {
                title: `Dispute ${status === 'approved' ? 'Approved ✅' : status === 'denied' ? 'Denied' : 'Resolved'}`,
                body: `Your dispute has been ${statusText}.`,
                tag: `dispute-admin-${id}`,
                url: '/account/orders',
                requireInteraction: status === 'approved',
              },
            },
          });
        } catch (_) { /* best effort */ }
      }
    },
    onSuccess: () => {
      toast.success('Dispute updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      setSelectedDispute(null);
      setAdminResponse('');
      setNewStatus('');
    },
    onError: () => toast.error('Failed to update dispute'),
  });

  const filtered = disputes?.filter((d: EnrichedDispute) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.dispute_number?.toLowerCase().includes(s) ||
      d.customer?.display_name?.toLowerCase().includes(s) ||
      d.customer?.email?.toLowerCase().includes(s) ||
      d.customer?.customer_id?.toLowerCase().includes(s) ||
      d.reason?.toLowerCase().includes(s) ||
      d.store?.name?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil((filtered?.length || 0) / PAGE_SIZE);
  const paginatedItems = filtered?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = {
    total: disputes?.length ?? 0,
    pending: disputes?.filter((d) => d.status === 'pending').length ?? 0,
    escalated: disputes?.filter((d) => d.status === 'escalated').length ?? 0,
    resolved: disputes?.filter((d) => ['resolved', 'approved', 'denied'].includes(d.status)).length ?? 0,
    frozen: disputes?.filter((d) => d.escrow?.escrow_frozen).length ?? 0,
    overdue: disputes?.filter((d: EnrichedDispute) => {
      if (d.status !== 'pending') return false;
      return getDeadlineInfo(d.created_at).isOverdue;
    }).length ?? 0,
  };

  return (
    <AdminLayout requiredPermissions={['manage_orders']}>
      <div className="space-y-6">
        {!isInsideHub && (
          <>
            <div>
              <h1 className="text-2xl font-display font-bold">Disputes & Escrow</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage customer disputes. Funds are frozen during active disputes.
              </p>
            </div>

            {stats.overdue > 0 && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  {stats.overdue} dispute{stats.overdue > 1 ? 's' : ''} overdue — seller 48h window expired.{' '}
                  <button className="underline" onClick={() => setStatusFilter('pending')}>View Pending</button>
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{stats.total}</span> total
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-yellow-500">{stats.pending}</span> pending
              </span>
              {stats.overdue > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-destructive">{stats.overdue}</span> overdue
                </span>
              )}
              <span className="text-muted-foreground">
                <span className="font-semibold text-amber-500">{stats.escalated}</span> escalated
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-green-500">{stats.resolved}</span> resolved
              </span>
              {stats.frozen > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-sky-400">{stats.frozen}</span> frozen
                </span>
              )}
            </div>
          </>
        )}

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <h3 className="font-semibold text-sm">All Disputes</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer, store..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="pl-9 w-full sm:w-[220px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-auto min-w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !filtered?.length ? (
              <div className="text-center py-16">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No disputes found</p>
                <p className="text-sm text-muted-foreground/60">All clear — no disputes match your filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispute</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Escrow</TableHead>
                        <TableHead>Filed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems?.map((d: EnrichedDispute) => {
                        const statusCfg = statusConfig[d.status] || statusConfig.pending;
                        const StatusIcon = statusCfg.icon;
                        const { isOverdue } = d.status === 'pending' ? getDeadlineInfo(d.created_at) : { isOverdue: false };
                        return (
                          <TableRow 
                            key={d.id}
                            className={cn(
                              "cursor-pointer hover:bg-muted/50 transition-colors",
                              isOverdue && "bg-destructive/[0.03]"
                            )}
                            onClick={() => {
                              setSelectedDispute(d);
                              setNewStatus(d.status);
                              setAdminResponse(d.admin_response || '');
                            }}
                          >
                            <TableCell>
                              <p className="text-sm font-mono font-medium text-primary">{d.dispute_number || '—'}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{d.customer?.display_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground font-mono">{d.customer?.customer_id || '—'}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{d.store?.name || '—'}</TableCell>
                            <TableCell className="text-sm max-w-[180px] truncate text-muted-foreground">{d.reason}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">£{Number(d.amount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(statusCfg.color, 'gap-1')}>
                                <StatusIcon className="h-3 w-3" />
                                {d.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{getDeadlineBadge(d)}</TableCell>
                            <TableCell>{getEscrowBadge(d)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedDispute(d); setNewStatus(d.status); setAdminResponse(d.admin_response || ''); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <DisputeDetailDialog
        dispute={selectedDispute}
        onClose={() => setSelectedDispute(null)}
        adminResponse={adminResponse}
        onAdminResponseChange={setAdminResponse}
        newStatus={newStatus}
        onNewStatusChange={setNewStatus}
        onUpdate={() => updateDispute.mutate({ id: selectedDispute!.id, status: newStatus, response: adminResponse, customerId: selectedDispute!.customer_id })}
        isUpdating={updateDispute.isPending}
      />
    </AdminLayout>
  );
}
