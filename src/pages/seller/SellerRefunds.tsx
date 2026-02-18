import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  RotateCcw, Check, X, AlertTriangle, Clock, 
  ShieldAlert, MessageSquare, Info
} from 'lucide-react';

export default function SellerRefunds() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [response, setResponse] = useState('');

  const { data: refundRequests, isLoading } = useQuery({
    queryKey: ['seller-refund-requests', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch customer profiles
      const customerIds = [...new Set((data || []).map((r: any) => r.customer_id))];
      if (customerIds.length === 0) return data;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', customerIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map((r: any) => ({ ...r, customer: profileMap[r.customer_id] || null }));
    },
    enabled: !!store?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'denied' }) => {
      const { error } = await supabase.from('refund_requests').update({
        status,
        seller_response: response.trim(),
        seller_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Refund ${status === 'approved' ? 'approved' : 'denied'}`);
      queryClient.invalidateQueries({ queryKey: ['seller-refund-requests'] });
      setSelectedRequest(null);
      setResponse('');
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (refundRequests || []).filter((r: any) => 
    statusFilter === 'all' || r.status === statusFilter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied': return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Denied</Badge>;
      case 'escalated': return <Badge className="bg-amber-600"><ShieldAlert className="h-3 w-3 mr-1" />Escalated</Badge>;
      case 'resolved': return <Badge className="bg-blue-600"><Check className="h-3 w-3 mr-1" />Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = (refundRequests || []).filter((r: any) => r.status === 'pending').length;
  const escalatedCount = (refundRequests || []).filter((r: any) => r.status === 'escalated').length;

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Refund Requests</h1>
          <p className="text-muted-foreground">
            Manage customer refund requests for your products
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">Total Requests</span>
              </div>
              <p className="text-2xl font-bold">{refundRequests?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Pending</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-sm">Escalated</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{escalatedCount}</p>
            </CardContent>
          </Card>
        </div>

        {escalatedCount > 0 && (
          <Card className="mb-6 bg-amber-500/5 border-amber-500/20">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-500">Escalated Requests</p>
                <p className="text-muted-foreground">
                  {escalatedCount} request(s) have been escalated to Eclipse for review. 
                  These are being handled by platform administrators.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {isLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-24" />)
          ) : filtered.length > 0 ? (
            filtered.map((r: any) => (
              <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedRequest(r)}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {r.customer?.display_name || 'Unknown Customer'}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{r.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.created_at), 'MMM d, yyyy')} · £{Number(r.amount).toFixed(2)}
                    </p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-muted-foreground ml-3" />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Refund Requests</h3>
                <p className="text-muted-foreground">
                  Customer refund requests will appear here when submitted.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setResponse(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund Request</DialogTitle>
            <DialogDescription>
              From {selectedRequest?.customer?.display_name || 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <span className="text-sm font-medium">Amount</span>
                <p className="text-lg font-bold">£{Number(selectedRequest.amount).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Reason</span>
                <p className="text-sm text-muted-foreground">{selectedRequest.reason}</p>
              </div>
              {selectedRequest.details && (
                <div>
                  <span className="text-sm font-medium">Details</span>
                  <p className="text-sm text-muted-foreground">{selectedRequest.details}</p>
                </div>
              )}
              {selectedRequest.escalation_reason && (
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="py-3">
                    <p className="text-sm font-medium text-amber-500">Escalation Reason</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.escalation_reason}</p>
                  </CardContent>
                </Card>
              )}
              {selectedRequest.seller_response && (
                <div>
                  <span className="text-sm font-medium">Your Response</span>
                  <p className="text-sm text-muted-foreground">{selectedRequest.seller_response}</p>
                </div>
              )}
              {selectedRequest.admin_response && (
                <div>
                  <span className="text-sm font-medium">Eclipse Decision</span>
                  <p className="text-sm text-muted-foreground">{selectedRequest.admin_response}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>Your Response</Label>
                    <Textarea 
                      value={response} 
                      onChange={e => setResponse(e.target.value)}
                      placeholder="Explain your decision..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => respondMutation.mutate({ id: selectedRequest.id, status: 'approved' })}
                      disabled={respondMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />Approve Refund
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => respondMutation.mutate({ id: selectedRequest.id, status: 'denied' })}
                      disabled={respondMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />Deny
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    If denied, the customer can escalate this to Eclipse for review.
                  </p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
