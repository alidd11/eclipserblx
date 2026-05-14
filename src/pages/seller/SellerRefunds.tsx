import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';
import { 
  RotateCcw, Check, X, AlertTriangle, Clock, 
  ShieldAlert, MessageSquare, FileImage
} from 'lucide-react';
import { DisputeEvidenceUpload } from '@/components/purchases/DisputeEvidenceUpload';
import { formatGBP } from '@/lib/formatters';

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

      const customerIds = [...new Set((data || []).map((r) => r.customer_id))];
      if (customerIds.length === 0) return data;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', customerIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return (data || []).map((r) => ({ ...r, customer: profileMap[r.customer_id] || null }));
    },
    enabled: !!store?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, status, customerId }: { id: string; status: 'approved' | 'denied'; customerId?: string }) => {
      const { error } = await supabase.from('refund_requests').update({
        status,
        seller_response: response.trim(),
        seller_responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;

      if (customerId) {
        const statusText = status === 'approved' ? 'approved' : 'denied';
        await supabase.from('notifications').insert({
          user_id: customerId,
          type: 'order_update',
          title: `Dispute ${status === 'approved' ? 'Approved' : 'Denied'}`,
          message: `The seller has ${statusText} your dispute.${status === 'approved' ? ' Your refund will be processed shortly.' : ''}`,
          link: '/account/orders',
        });

        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_ids: [customerId],
              payload: {
                title: `Dispute ${status === 'approved' ? 'Approved \u2705' : 'Denied'}`,
                body: `The seller has ${statusText} your dispute.${status === 'approved' ? ' Your refund will be processed shortly.' : ''}`,
                tag: `dispute-response-${id}`,
                url: '/account/orders',
              },
            },
          });
        } catch (_) { /* best effort */ }
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(`Refund ${status === 'approved' ? 'approved' : 'denied'}`);
      queryClient.invalidateQueries({ queryKey: ['seller-refund-requests'] });
      setSelectedRequest(null);
      setResponse('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (refundRequests || []).filter((r) => 
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

  const pendingCount = (refundRequests || []).filter((r) => r.status === 'pending').length;
  const escalatedCount = (refundRequests || []).filter((r) => r.status === 'escalated').length;

  return (
    <SellerLayout>
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-display font-bold">Disputes</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer disputes for your products. Respond within 48 hours to prevent escalation.
          </p>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm mb-4 flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{refundRequests?.length || 0}</span> total
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-yellow-500">{pendingCount}</span> pending
          </span>
          {escalatedCount > 0 && (
            <span className="text-muted-foreground">
              <span className="font-semibold text-destructive">{escalatedCount}</span> escalated
            </span>
          )}
        </div>

        {escalatedCount > 0 && (
          <div className="flex items-start gap-2 text-sm text-amber-500 mb-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{escalatedCount} request(s) escalated to Eclipse for review.</p>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-auto min-w-[140px]">
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
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {filtered.map((r) => (
              <button
                key={r.id}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setSelectedRequest(r)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-primary">{r.dispute_number}</span>
                    <span className="text-sm font-medium">
                      {(r as any).customer?.display_name || 'Unknown Customer'}
                    </span>
                    {getStatusBadge(r.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(r.created_at), 'MMM d, yyyy')} · {formatGBP(Number(r.amount))}
                  </p>
                </div>
                <MessageSquare className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <RotateCcw className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm font-medium mb-1">No Refund Requests</p>
            <p className="text-xs text-muted-foreground">Customer refund requests will appear here when submitted.</p>
          </div>
        )}
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); setResponse(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispute {selectedRequest?.dispute_number || ''}</DialogTitle>
            <DialogDescription>
              From {selectedRequest?.customer?.display_name || 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <SellerDisputeDetail
              request={selectedRequest}
              response={response}
              setResponse={setResponse}
              respondMutation={respondMutation as unknown as { mutate: (v: unknown) => void; isPending: boolean }}
              getStatusBadge={getStatusBadge}
            />
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SellerDisputeDetail({ request, response, setResponse, respondMutation, getStatusBadge }: { request: any; response: string; setResponse: (v: string) => void; respondMutation: { mutate: (v: unknown) => void; isPending: boolean }; getStatusBadge: (s: string) => React.ReactNode }) {
  const { data: evidence } = useQuery({
    queryKey: ['dispute-evidence-seller', request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispute_evidence')
        .select('*')
        .eq('dispute_id', request.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!request.id,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        {getStatusBadge(request.status)}
      </div>
      <div>
        <span className="text-sm font-medium">Amount</span>
        <p className="text-lg font-bold">{formatGBP(Number(request.amount))}</p>
      </div>
      <div>
        <span className="text-sm font-medium">Reason</span>
        <p className="text-sm text-muted-foreground">{request.reason}</p>
      </div>
      {request.details && (
        <div>
          <span className="text-sm font-medium">Details</span>
          <p className="text-sm text-muted-foreground">{request.details}</p>
        </div>
      )}

      {evidence && evidence.length > 0 && (
        <div>
          <span className="text-sm font-medium flex items-center gap-1.5 mb-2">
            <FileImage className="h-3.5 w-3.5" /> Customer Evidence ({evidence.length})
          </span>
          <div className="space-y-1">
            {evidence.map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                <FileImage className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{e.file_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {request.escalation_reason && (
        <div className="border-l-2 border-amber-500 pl-3">
          <p className="text-sm font-medium text-amber-500">Escalation Reason</p>
          <p className="text-sm text-muted-foreground">{request.escalation_reason}</p>
        </div>
      )}
      {request.seller_response && (
        <div>
          <span className="text-sm font-medium">Your Response</span>
          <p className="text-sm text-muted-foreground">{request.seller_response}</p>
        </div>
      )}
      {request.admin_response && (
        <div>
          <span className="text-sm font-medium">Eclipse Decision</span>
          <p className="text-sm text-muted-foreground">{request.admin_response}</p>
        </div>
      )}

      {request.status === 'pending' && (
        <>
          <div className="space-y-2">
            <Label>Your Response</Label>
            <Textarea 
              value={response} 
              onChange={e => {
                if (e.target.value.length <= 1000) {
                  setResponse(e.target.value);
                }
              }}
              placeholder="Explain your decision..."
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{response.length}/1,000</p>
          </div>

          <div className="space-y-2">
            <Label>Attach Evidence (optional)</Label>
            <DisputeEvidenceUpload
              disputeId={request.id}
              onFilesChange={() => {}}
              maxFiles={5}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => respondMutation.mutate({ id: request.id, status: 'approved', customerId: request.customer_id })}
              disabled={respondMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />Approve Refund
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => respondMutation.mutate({ id: request.id, status: 'denied', customerId: request.customer_id })}
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
  );
}
