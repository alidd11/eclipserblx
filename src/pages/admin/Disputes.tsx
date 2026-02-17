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
import { AlertTriangle, Search, Eye, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  under_review: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const reasonLabels: Record<string, string> = {
  not_as_described: 'Not as described',
  not_received: 'Not received',
  defective: 'Defective',
  unauthorized: 'Unauthorized',
  other: 'Other',
};

export default function Disputes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('order_disputes')
        .select(`
          *,
          orders (id, total, status, created_at),
          profiles!order_disputes_user_id_fkey (display_name, username, email, customer_id)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from('order_disputes')
        .update({
          status,
          admin_notes: notes || null,
          resolved_at: ['resolved', 'rejected'].includes(status) ? new Date().toISOString() : null,
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Dispute updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      setSelectedDispute(null);
      setAdminNotes('');
      setNewStatus('');
    },
    onError: (err) => {
      toast.error('Failed to update dispute');
      console.error(err);
    },
  });

  const filtered = disputes?.filter((d: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.profiles?.display_name?.toLowerCase().includes(s) ||
      d.profiles?.email?.toLowerCase().includes(s) ||
      d.profiles?.customer_id?.toLowerCase().includes(s) ||
      d.reason?.toLowerCase().includes(s) ||
      d.orders?.id?.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: disputes?.length ?? 0,
    open: disputes?.filter((d: any) => d.status === 'open').length ?? 0,
    underReview: disputes?.filter((d: any) => d.status === 'under_review').length ?? 0,
    resolved: disputes?.filter((d: any) => d.status === 'resolved').length ?? 0,
  };

  return (
    <AdminLayout requiredPermissions={['manage_orders']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Order Disputes
          </h1>
          <p className="text-muted-foreground">Review and manage customer dispute requests.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminStatCard label="Total Disputes" value={stats.total} />
          <AdminStatCard label="Open" value={stats.open} valueColor="yellow" />
          <AdminStatCard label="Under Review" value={stats.underReview} valueColor="blue" />
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
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                      <TableHead>Reason</TableHead>
                      <TableHead>Order Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((dispute: any) => (
                      <TableRow key={dispute.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dispute.profiles?.display_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{dispute.profiles?.customer_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{reasonLabels[dispute.reason] || dispute.reason}</TableCell>
                        <TableCell>£{dispute.orders?.total?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[dispute.status] || ''}>
                            {dispute.status?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(dispute.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setNewStatus(dispute.status);
                              setAdminNotes(dispute.admin_notes || '');
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
            <DialogDescription>
              Review and update this dispute.
            </DialogDescription>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedDispute.profiles?.display_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{selectedDispute.profiles?.customer_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">{reasonLabels[selectedDispute.reason] || selectedDispute.reason}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Total</p>
                  <p className="font-medium">£{selectedDispute.orders?.total?.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Customer Description</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  {selectedDispute.description}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Open</span>
                    </SelectItem>
                    <SelectItem value="under_review">
                      <span className="flex items-center gap-2"><Eye className="h-3 w-3" /> Under Review</span>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <span className="flex items-center gap-2"><CheckCircle className="h-3 w-3" /> Resolved</span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="flex items-center gap-2"><XCircle className="h-3 w-3" /> Rejected</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this dispute..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => updateDispute.mutate({ id: selectedDispute.id, status: newStatus, notes: adminNotes })}
                  disabled={updateDispute.isPending}
                >
                  {updateDispute.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
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
