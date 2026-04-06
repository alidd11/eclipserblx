import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { 
 AlertTriangle, Search, Eye, Loader2, CheckCircle, XCircle, Clock, 
 ShieldAlert, Shield, Snowflake, User, Store, FileText,
 Calendar, Banknote, MessageSquare, ExternalLink, Timer, AlertCircle,
 ArrowUpRight, ChevronLeft, ChevronRight, FileImage
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, addHours } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';


interface DisputeProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  customer_id: string | null;
}

interface DisputeStore {
  id: string;
  name: string;
  store_id: string;
}

interface EscrowInfo {
  order_id: string;
  escrow_hold_until: string | null;
  escrow_released_at: string | null;
  escrow_frozen: boolean;
}

interface DisputeTicket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  category: string;
}

interface RefundRequest {
  id: string;
  customer_id: string;
  store_id: string | null;
  order_id: string | null;
  status: string;
  created_at: string;
  reason: string | null;
  admin_response: string | null;
  seller_responded_at: string | null;
  escalated_at: string | null;
  admin_resolved_at: string | null;
  admin_resolved_by: string | null;
  amount: number | null;
  evidence: unknown[] | null;
  updated_at: string;
}

interface EnrichedDispute extends RefundRequest {
  customer: DisputeProfile | null;
  store: DisputeStore | null;
  escrow: EscrowInfo | null;
  linkedTicket: DisputeTicket | null;
}

const SELLER_DEADLINE_HOURS = 48;
const PAGE_SIZE = 20;

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
 pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pending (Seller)' },
 approved: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle, label: 'Approved' },
 denied: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Denied' },
 escalated: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert, label: 'Escalated' },
 resolved: { color: 'bg-primary/10 text-primary border-primary/20', icon: Shield, label: 'Resolved' },
};

// Helper: get deadline info for a pending dispute
function getDeadlineInfo(createdAt: string) {
 const deadline = addHours(new Date(createdAt), SELLER_DEADLINE_HOURS);
 const now = new Date();
 const hoursLeft = differenceInHours(deadline, now);
 const isOverdue = deadline < now;
 return { deadline, hoursLeft, isOverdue };
}

// Build a timeline from dispute fields
function buildTimeline(d: EnrichedDispute) {
 const events: { label: string; time: string; icon: typeof Clock; color: string }[] = [];
 
 events.push({ label: 'Dispute filed', time: d.created_at, icon: AlertTriangle, color: 'text-destructive' });
 
 if (d.seller_responded_at) {
 const status = d.status === 'approved' ? 'approved refund' : d.status === 'denied' ? 'denied refund' : 'responded';
 events.push({ label: `Seller ${status}`, time: d.seller_responded_at, icon: Store, color: 'text-muted-foreground' });
 }
 
 if (d.escalated_at) {
 events.push({ label: 'Escalated to Eclipse', time: d.escalated_at, icon: ShieldAlert, color: 'text-amber-500' });
 }
 
 if (d.admin_resolved_at) {
 events.push({ label: 'Admin resolved', time: d.admin_resolved_at, icon: Shield, color: 'text-primary' });
 }
 
 return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

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
 // Find linked support tickets (auto-created with category=refund)
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
 
 // Try to match tickets to disputes by customer + order reference in subject
 const ticketsBySubject = (ticketsRes.data || []) as DisputeTicket[];

 return (data || []).map((r) => {
 // Find matching ticket by checking if subject contains the order_id
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

 // Notify buyer about admin resolution
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

 // Pagination
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

 const getEscrowBadge = (d: EnrichedDispute) => {
 if (!d.escrow) return null;
 if (d.escrow.escrow_frozen) {
 return (
 <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 gap-1">
 <Snowflake className="h-3 w-3" />
 Frozen
 </Badge>
 );
 }
 if (d.escrow.escrow_released_at) {
 return (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
 <CheckCircle className="h-3 w-3" />
 Released
 </Badge>
 );
 }
 if (d.escrow.escrow_hold_until) {
 const holdDate = new Date(d.escrow.escrow_hold_until);
 const isHeld = holdDate > new Date();
 return (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
 <Clock className="h-3 w-3" />
 {isHeld ? `Held ${formatDistanceToNow(holdDate)}` : 'Hold expired'}
 </Badge>
 );
 }
 return null;
 };

 const getDeadlineBadge = (d: EnrichedDispute) => {
 if (d.status !== 'pending') return null;
 const { hoursLeft, isOverdue } = getDeadlineInfo(d.created_at);
 if (isOverdue) {
 return (
 <Tooltip>
 <TooltipTrigger>
 <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
 <AlertCircle className="h-3 w-3" />
 Overdue
 </Badge>
 </TooltipTrigger>
 <TooltipContent>Seller 48h window expired — consider escalation</TooltipContent>
 </Tooltip>
 );
 }
 if (hoursLeft <= 12) {
 return (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
 <Timer className="h-3 w-3" />
 {hoursLeft}h left
 </Badge>
 );
 }
 return null;
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

 {/* Pagination */}
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

 {/* Dispute Detail Dialog */}
 <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
 <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-destructive" />
 Dispute {selectedDispute?.dispute_number || 'Review'}
 </DialogTitle>
 <DialogDescription>
 Review dispute details, escrow status, and take action.
 </DialogDescription>
 </DialogHeader>
 {selectedDispute && (
 <ScrollArea className="flex-1 -mx-6 px-6">
 <div className="space-y-5 pb-2">
 {/* Quick info grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="rounded-lg border bg-muted/30 p-3">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
 <User className="h-3 w-3" /> Customer
 </div>
 <p className="text-sm font-medium truncate">{selectedDispute.customer?.display_name || 'Unknown'}</p>
 <p className="text-xs text-muted-foreground font-mono">{selectedDispute.customer?.customer_id || '—'}</p>
 </div>
 <div className="rounded-lg border bg-muted/30 p-3">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
 <Store className="h-3 w-3" /> Store
 </div>
 <p className="text-sm font-medium truncate">{selectedDispute.store?.name || '—'}</p>
 </div>
 <div className="rounded-lg border bg-muted/30 p-3">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
 <Banknote className="h-3 w-3" /> Amount
 </div>
 <p className="text-sm font-bold">£{Number(selectedDispute.amount).toFixed(2)}</p>
 </div>
 <div className="rounded-lg border bg-muted/30 p-3">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
 <Calendar className="h-3 w-3" /> Filed
 </div>
 <p className="text-sm font-medium">{format(new Date(selectedDispute.created_at), 'dd MMM yyyy')}</p>
 <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(selectedDispute.created_at), { addSuffix: true })}</p>
 </div>
 </div>

 {/* Deadline + Linked Ticket row */}
 <div className="flex flex-wrap gap-2">
 {selectedDispute.status === 'pending' && (() => {
 const { hoursLeft, isOverdue } = getDeadlineInfo(selectedDispute.created_at);
 return (
 <Badge variant="outline" className={cn(
 'gap-1',
 isOverdue ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
 )}>
 <Timer className="h-3 w-3" />
 {isOverdue ? 'Seller 48h window expired' : `${hoursLeft}h remaining for seller response`}
 </Badge>
 );
 })()}
 {selectedDispute.linkedTicket && (
 <Link to={`/admin/customer-tickets`} onClick={() => setSelectedDispute(null)}>
 <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20 cursor-pointer hover:bg-primary/10">
 <ExternalLink className="h-3 w-3" />
 Linked Ticket: {selectedDispute.linkedTicket.ticket_number}
 </Badge>
 </Link>
 )}
 </div>

 {/* Escrow Status Banner */}
 {selectedDispute.escrow && (
 <div className={cn('border', selectedDispute.escrow.escrow_frozen ? 'border-sky-500/30 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5')}>
 <div className="p-4 py-3 px-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {selectedDispute.escrow.escrow_frozen ? (
 <Snowflake className="h-4 w-4 text-sky-400" />
 ) : (
 <Clock className="h-4 w-4 text-amber-500" />
 )}
 <div>
 <p className="text-sm font-medium">
 {selectedDispute.escrow.escrow_frozen 
 ? 'Escrow Frozen — Funds locked until resolution'
 : selectedDispute.escrow.escrow_released_at 
 ? 'Escrow Released — Funds paid to seller'
 : `Escrow Hold — Releases ${formatDistanceToNow(new Date(selectedDispute.escrow.escrow_hold_until), { addSuffix: true })}`
 }
 </p>
 <p className="text-xs text-muted-foreground">
 {selectedDispute.escrow.escrow_frozen 
 ? 'Dispute triggered automatic freeze. Resolve dispute to release or refund.'
 : selectedDispute.escrow.escrow_released_at
 ? 'Manual recovery from seller may be needed if refund is approved.'
 : 'Funds will auto-release after hold period if dispute is resolved.'
 }
 </p>
 </div>
 </div>
 {getEscrowBadge(selectedDispute)}
 </div>
 </div>
 </div>
 )}

 {/* Status */}
 <div className="flex items-center gap-2">
 <span className="text-sm text-muted-foreground">Current Status:</span>
 {(() => {
 const cfg = statusConfig[selectedDispute.status] || statusConfig.pending;
 const Icon = cfg.icon;
 return (
 <Badge variant="outline" className={cn(cfg.color, 'gap-1')}>
 <Icon className="h-3 w-3" />
 {cfg.label}
 </Badge>
 );
 })()}
 </div>

 <Separator />

 {/* Timeline */}
 <div>
 <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
 <Clock className="h-3.5 w-3.5" /> Timeline
 </p>
 <div className="relative pl-4 space-y-3 border-l-2 border-border ml-1">
 {buildTimeline(selectedDispute).map((event, i) => (
 <div key={i} className="relative">
 <div className={cn('absolute -left-[1.35rem] top-0.5 p-0.5 rounded-full bg-card border-2 border-border')}>
 <event.icon className={cn('h-2.5 w-2.5', event.color)} />
 </div>
 <div className="ml-2">
 <p className="text-sm font-medium">{event.label}</p>
 <p className="text-xs text-muted-foreground">
 {format(new Date(event.time), 'dd MMM yyyy, h:mm a')} · {formatDistanceToNow(new Date(event.time), { addSuffix: true })}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>

 <Separator />

 {/* Reason */}
 <div>
 <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
 <MessageSquare className="h-3.5 w-3.5" /> Customer Reason
 </p>
 <p className="text-sm text-foreground">{selectedDispute.reason}</p>
 </div>

 {selectedDispute.details && (
 <div>
 <p className="text-sm font-medium mb-1.5">Additional Details</p>
 <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground leading-relaxed">
 {selectedDispute.details}
 </div>
 </div>
 )}

 {/* Seller Response */}
 {selectedDispute.seller_response && (
 <div>
 <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
 <Store className="h-3.5 w-3.5" /> Seller Response
 {selectedDispute.seller_responded_at && (
 <span className="text-xs text-muted-foreground font-normal">
 — {formatDistanceToNow(new Date(selectedDispute.seller_responded_at), { addSuffix: true })}
 </span>
 )}
 </p>
 <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground leading-relaxed">
 {selectedDispute.seller_response}
 </div>
 </div>
 )}

 {/* Evidence Attachments */}
 <DisputeEvidenceSection disputeId={selectedDispute.id} />

 {/* Escalation */}
 {selectedDispute.escalation_reason && (
 <div className="border-amber-500/20 bg-amber-500/5">
 <div className="p-4 py-3 px-4">
 <div className="flex items-center gap-2 mb-1">
 <ShieldAlert className="h-4 w-4 text-amber-500" />
 <p className="text-sm font-medium text-amber-600">Escalation Reason</p>
 </div>
 <p className="text-sm text-muted-foreground">{selectedDispute.escalation_reason}</p>
 {selectedDispute.escalated_at && (
 <p className="text-xs text-muted-foreground/60 mt-1">
 Escalated {formatDistanceToNow(new Date(selectedDispute.escalated_at), { addSuffix: true })}
 </p>
 )}
 </div>
 </div>
 )}

 {/* Previous admin response */}
 {selectedDispute.admin_response && selectedDispute.admin_resolved_at && (
 <div>
 <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
 <Shield className="h-3.5 w-3.5" /> Previous Admin Decision
 <span className="text-xs text-muted-foreground font-normal">
 — {formatDistanceToNow(new Date(selectedDispute.admin_resolved_at), { addSuffix: true })}
 </span>
 </p>
 <div className="rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground leading-relaxed">
 {selectedDispute.admin_response}
 </div>
 </div>
 )}

 <Separator />

 {/* Admin Actions */}
 <div className="space-y-3">
 <Label className="text-sm font-medium">Update Status</Label>
 <Select value={newStatus} onValueChange={setNewStatus}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="pending">
 <span className="flex items-center gap-2"><Clock className="h-3 w-3 text-yellow-500" /> Pending (Seller)</span>
 </SelectItem>
 <SelectItem value="escalated">
 <span className="flex items-center gap-2"><ShieldAlert className="h-3 w-3 text-amber-500" /> Escalated</span>
 </SelectItem>
 <SelectItem value="approved">
 <span className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-emerald-500" /> Approved (Refund)</span>
 </SelectItem>
 <SelectItem value="denied">
 <span className="flex items-center gap-2"><XCircle className="h-3 w-3 text-destructive" /> Denied</span>
 </SelectItem>
 <SelectItem value="resolved">
 <span className="flex items-center gap-2"><Shield className="h-3 w-3 text-primary" /> Resolved</span>
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-sm font-medium">Eclipse Admin Response</Label>
 <Textarea
 value={adminResponse}
 onChange={(e) => setAdminResponse(e.target.value)}
 placeholder="Add your response or resolution notes..."
 className="min-h-[80px] resize-none"
 />
 </div>

 <div className="flex justify-end gap-2 pt-2">
 <Button variant="outline" onClick={() => setSelectedDispute(null)}>Cancel</Button>
 <Button
 onClick={() => updateDispute.mutate({ id: selectedDispute.id, status: newStatus, response: adminResponse, customerId: selectedDispute.customer_id })}
 disabled={updateDispute.isPending || !newStatus}
 >
 {updateDispute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
 Update Dispute
 </Button>
 </div>
 </div>
 </ScrollArea>
 )}
 </DialogContent>
 </Dialog>
 </AdminLayout>
 );
}

function DisputeEvidenceSection({ disputeId }: { disputeId: string }) {
 const { data: evidence, isLoading } = useQuery({
 queryKey: ['admin-dispute-evidence', disputeId],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('dispute_evidence')
 .select('*')
 .eq('dispute_id', disputeId)
 .order('created_at', { ascending: true });
 if (error) throw error;
 return data || [];
 },
 enabled: !!disputeId,
 });

 if (isLoading || !evidence || evidence.length === 0) return null;

 return (
 <div>
 <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
 <FileImage className="h-3.5 w-3.5" /> Evidence Attachments ({evidence.length})
 </p>
 <div className="space-y-2">
 {evidence.map((e: Record<string, string>) => (
 <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-sm">
 <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
 <span className="truncate flex-1">{e.file_name}</span>
 <span className="text-xs text-muted-foreground shrink-0">
 {e.file_size < 1024 * 1024 
 ? `${(e.file_size / 1024).toFixed(1)} KB` 
 : `${(e.file_size / (1024 * 1024)).toFixed(1)} MB`}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
}
