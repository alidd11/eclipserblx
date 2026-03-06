import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  ShieldAlert, Shield, Snowflake, ArrowRight, User, Store, FileText,
  Calendar, Banknote, MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pending (Seller)' },
  approved: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle, label: 'Approved' },
  denied: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Denied' },
  escalated: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert, label: 'Escalated' },
  resolved: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Shield, label: 'Resolved' },
};

export default function Disputes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');

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

      const customerIds = [...new Set((data || []).map((r: any) => r.customer_id))];
      const storeIds = [...new Set((data || []).map((r: any) => r.store_id).filter(Boolean))];
      const orderIds = [...new Set((data || []).map((r: any) => r.order_id).filter(Boolean))];

      const [profilesRes, storesRes, escrowRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from('profiles').select('user_id, display_name, username, email, customer_id').in('user_id', customerIds)
          : { data: [] },
        storeIds.length > 0
          ? supabase.from('stores').select('id, name, store_id').in('id', storeIds)
          : { data: [] },
        orderIds.length > 0
          ? supabase.from('seller_transactions').select('order_id, escrow_hold_until, escrow_released_at, escrow_frozen').in('order_id', orderIds)
          : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p]));
      const storeMap = Object.fromEntries((storesRes.data || []).map(s => [s.id, s]));
      const escrowMap = Object.fromEntries((escrowRes.data || []).map(e => [e.order_id, e]));

      return (data || []).map((r: any) => ({
        ...r,
        customer: profileMap[r.customer_id] || null,
        store: storeMap[r.store_id] || null,
        escrow: escrowMap[r.order_id] || null,
      }));
    },
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: string; response: string }) => {
      const updateData: any = {
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

  const filtered = disputes?.filter((d: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.customer?.display_name?.toLowerCase().includes(s) ||
      d.customer?.email?.toLowerCase().includes(s) ||
      d.customer?.customer_id?.toLowerCase().includes(s) ||
      d.reason?.toLowerCase().includes(s) ||
      d.store?.name?.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: disputes?.length ?? 0,
    pending: disputes?.filter((d: any) => d.status === 'pending').length ?? 0,
    escalated: disputes?.filter((d: any) => d.status === 'escalated').length ?? 0,
    resolved: disputes?.filter((d: any) => ['resolved', 'approved', 'denied'].includes(d.status)).length ?? 0,
    frozen: disputes?.filter((d: any) => d.escrow?.escrow_frozen).length ?? 0,
  };

  const getEscrowBadge = (d: any) => {
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

  return (
    <AdminLayout requiredPermissions={['manage_orders']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              Disputes & Escrow
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer disputes. Funds are frozen during active disputes.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: FileText, color: 'text-foreground' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
            { label: 'Escalated', value: stats.escalated, icon: ShieldAlert, color: 'text-amber-500' },
            { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-500' },
            { label: 'Funds Frozen', value: stats.frozen, icon: Snowflake, color: 'text-sky-400' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <CardTitle className="text-lg">All Disputes</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customer, store..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full sm:w-[220px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
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
          </CardHeader>
          <CardContent>
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
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Escrow</TableHead>
                      <TableHead>Filed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d: any) => {
                      const statusCfg = statusConfig[d.status] || statusConfig.pending;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow 
                          key={d.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedDispute(d);
                            setNewStatus(d.status);
                            setAdminResponse(d.admin_response || '');
                          }}
                        >
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
                            <Badge variant="outline" className={`${statusCfg.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {d.status}
                            </Badge>
                          </TableCell>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispute Detail Dialog — improved */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Dispute Review
            </DialogTitle>
            <DialogDescription>
              Review dispute details, escrow status, and take action.
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-5">
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

              {/* Escrow Status Banner */}
              {selectedDispute.escrow && (
                <Card className={`border ${selectedDispute.escrow.escrow_frozen ? 'border-sky-500/30 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                  <CardContent className="py-3 px-4">
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
                  </CardContent>
                </Card>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                {(() => {
                  const cfg = statusConfig[selectedDispute.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <Badge variant="outline" className={`${cfg.color} gap-1`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  );
                })()}
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

              {/* Escalation */}
              {selectedDispute.escalation_reason && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="py-3 px-4">
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
                  </CardContent>
                </Card>
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
                      <span className="flex items-center gap-2"><Shield className="h-3 w-3 text-blue-500" /> Resolved</span>
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
                  onClick={() => updateDispute.mutate({ id: selectedDispute.id, status: newStatus, response: adminResponse })}
                  disabled={updateDispute.isPending || !newStatus}
                >
                  {updateDispute.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Dispute
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
