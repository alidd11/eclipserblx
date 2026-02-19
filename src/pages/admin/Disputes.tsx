import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AlertTriangle, Search, Eye, Loader2, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  denied: 'bg-destructive/10 text-destructive border-destructive/20',
  escalated: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  resolved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
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

      // Fetch customer profiles, store names
      const customerIds = [...new Set((data || []).map((r: any) => r.customer_id))];
      const storeIds = [...new Set((data || []).map((r: any) => r.store_id).filter(Boolean))];

      const [profilesRes, storesRes] = await Promise.all([
        customerIds.length > 0
          ? supabase.from('profiles').select('user_id, display_name, username, email, customer_id').in('user_id', customerIds)
          : { data: [] },
        storeIds.length > 0
          ? supabase.from('stores').select('id, name').in('id', storeIds)
          : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p]));
      const storeMap = Object.fromEntries((storesRes.data || []).map(s => [s.id, s]));

      return (data || []).map((r: any) => ({
        ...r,
        customer: profileMap[r.customer_id] || null,
        store: storeMap[r.store_id] || null,
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
      if (status === 'resolved') {
        updateData.admin_resolved_at = new Date().toISOString();
        updateData.admin_resolved_by = (await supabase.auth.getUser()).data.user?.id;
      }
      const { error } = await supabase.from('refund_requests').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dispute updated');
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
    resolved: disputes?.filter((d: any) => ['resolved', 'approved'].includes(d.status)).length ?? 0,
  };

  return (
    <AdminLayout requiredPermissions={['manage_orders']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Customer Disputes
          </h1>
          <p className="text-muted-foreground">
            Disputes go to sellers first. Escalated disputes need Eclipse review.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard label="Total" value={stats.total} />
          <AdminStatCard label="Pending (Seller)" value={stats.pending} valueColor="yellow" />
          <AdminStatCard label="Escalated" value={stats.escalated} valueColor="orange" />
          <AdminStatCard label="Resolved" value={stats.resolved} valueColor="green" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <CardTitle className="text-lg">All Disputes</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
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
              <p className="text-center text-muted-foreground py-12">No disputes found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{d.customer?.display_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{d.customer?.customer_id}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{d.store?.name || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{d.reason}</TableCell>
                        <TableCell>£{Number(d.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[d.status] || ''}>
                            {d.status === 'escalated' && <ShieldAlert className="h-3 w-3 mr-1" />}
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(d.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDispute(d);
                              setNewStatus(d.status);
                              setAdminResponse(d.admin_response || '');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
            <DialogDescription>Review and manage this dispute.</DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedDispute.customer?.display_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Store</p>
                  <p className="font-medium">{selectedDispute.store?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">£{Number(selectedDispute.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColors[selectedDispute.status] || ''}>
                    {selectedDispute.status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <p className="text-sm font-medium">{selectedDispute.reason}</p>
              </div>

              {selectedDispute.details && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer Details</p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    {selectedDispute.details}
                  </div>
                </div>
              )}

              {selectedDispute.seller_response && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Seller Response</p>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    {selectedDispute.seller_response}
                  </div>
                </div>
              )}

              {selectedDispute.escalation_reason && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="py-3">
                    <p className="text-sm font-medium text-amber-600">Escalation Reason</p>
                    <p className="text-sm text-muted-foreground">{selectedDispute.escalation_reason}</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Pending</span>
                    </SelectItem>
                    <SelectItem value="escalated">
                      <span className="flex items-center gap-2"><ShieldAlert className="h-3 w-3" /> Escalated</span>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <span className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Resolved</span>
                    </SelectItem>
                    <SelectItem value="denied">
                      <span className="flex items-center gap-2"><XCircle className="h-3 w-3" /> Rejected</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Eclipse Response</Label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Add your response or resolution notes..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedDispute(null)}>Cancel</Button>
                <Button
                  onClick={() => updateDispute.mutate({ id: selectedDispute.id, status: newStatus, response: adminResponse })}
                  disabled={updateDispute.isPending}
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
