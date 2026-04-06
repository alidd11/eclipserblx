import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, Clock, Check, X, ShieldAlert, Shield, Loader2,
  ArrowUpRight, Store, FileImage,
} from 'lucide-react';
import { DisputeEvidenceUpload } from './DisputeEvidenceUpload';

interface DisputeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disputeId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
  denied: { label: 'Denied by Seller', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: X },
  approved: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Check },
  escalated: { label: 'Escalated to Eclipse', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert },
  resolved: { label: 'Resolved', color: 'bg-primary/10 text-primary border-primary/20', icon: Shield },
};

export function DisputeStatusDialog({ open, onOpenChange, disputeId }: DisputeStatusDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [escalationReason, setEscalationReason] = useState('');
  const [showEscalateForm, setShowEscalateForm] = useState(false);

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['dispute-status', disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', disputeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!disputeId,
  });

  // Fetch evidence files
  const { data: evidence } = useQuery({
    queryKey: ['dispute-evidence', disputeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispute_evidence')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!disputeId,
  });

  const escalateMutation = useMutation({
    mutationFn: async () => {
      if (!escalationReason.trim()) throw new Error('Please provide a reason');
      const { error } = await supabase.rpc('escalate_dispute', {
        p_dispute_id: disputeId,
        p_reason: escalationReason.trim(),
      });
      if (error) throw error;

      // Send Discord notification
      supabase.functions.invoke('send-ticket-notification', {
        body: {
          ticket_number: dispute?.dispute_number || `DSP-${disputeId.substring(0, 6).toUpperCase()}`,
          subject: 'Customer Escalated Dispute',
          category: 'Dispute',
          customer_name: user?.user_metadata?.display_name || user?.email || 'Unknown',
          type: 'customer',
          is_escalation: true,
        },
      }).catch(err => console.error('Notification failed:', err));
    },
    onSuccess: () => {
      toast.success('Dispute escalated to Eclipse for review');
      setShowEscalateForm(false);
      setEscalationReason('');
      queryClient.invalidateQueries({ queryKey: ['dispute-status', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['user-disputes'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to escalate'),
  });

  // Build timeline
  const timeline: { label: string; time: string; icon: any; color: string }[] = [];
  if (dispute) {
    timeline.push({ label: 'Dispute filed', time: dispute.created_at, icon: AlertTriangle, color: 'text-destructive' });
    if (dispute.seller_responded_at) {
      const action = dispute.status === 'approved' || (dispute as any).seller_response
        ? (dispute.status === 'denied' || (dispute as any).escalated_at ? 'denied refund' : 'approved refund')
        : 'responded';
      timeline.push({ label: `Seller ${action}`, time: dispute.seller_responded_at, icon: Store, color: 'text-muted-foreground' });
    }
    if ((dispute as any).escalated_at) {
      timeline.push({ label: 'Escalated to Eclipse', time: (dispute as any).escalated_at, icon: ShieldAlert, color: 'text-amber-500' });
    }
    if (dispute.admin_resolved_at) {
      timeline.push({ label: 'Eclipse resolved', time: dispute.admin_resolved_at, icon: Shield, color: 'text-primary' });
    }
    timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }

  const cfg = statusConfig[dispute?.status || 'pending'] || statusConfig.pending;
  const StatusIcon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dispute {dispute?.dispute_number || 'Status'}
          </DialogTitle>
          <DialogDescription>Track your dispute progress and take action if needed.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : dispute ? (
          <div className="space-y-5">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="outline" className={cn(cfg.color, 'gap-1')}>
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </Badge>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dispute Amount</span>
              <span className="font-bold">£{Number(dispute.amount).toFixed(2)}</span>
            </div>

            <Separator />

            {/* Timeline */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Timeline
              </p>
              <div className="relative pl-4 space-y-3 border-l-2 border-border ml-1">
                {timeline.map((event, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[1.35rem] top-0.5 p-0.5 rounded-full bg-card border-2 border-border">
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
              <p className="text-sm font-medium mb-1">Your Reason</p>
              <p className="text-sm text-muted-foreground">{dispute.reason}</p>
              {dispute.details && (
                <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {dispute.details}
                </div>
              )}
            </div>

            {/* Seller Response */}
            {dispute.seller_response && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Seller Response
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {dispute.seller_response}
                </div>
              </div>
            )}

            {/* Admin Response */}
            {dispute.admin_response && (
              <div>
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Eclipse Decision
                </p>
                <div className="rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
                  {dispute.admin_response}
                </div>
              </div>
            )}

            {/* Escalation Reason (if already escalated) */}
            {(dispute as any).escalation_reason && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-sm font-medium text-amber-600 mb-1">Escalation Reason</p>
                <p className="text-sm text-muted-foreground">{(dispute as any).escalation_reason}</p>
              </div>
            )}

            {/* Evidence */}
            {evidence && evidence.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5" /> Evidence ({evidence.length})
                </p>
                <div className="space-y-2">
                  {evidence.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-sm">
                      <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{e.file_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add more evidence (if dispute is active) */}
            {['pending', 'denied', 'escalated'].includes(dispute.status) && (
              <div>
                <p className="text-sm font-medium mb-2">Add Evidence</p>
                <DisputeEvidenceUpload
                  disputeId={disputeId}
                  onFilesChange={() => queryClient.invalidateQueries({ queryKey: ['dispute-evidence', disputeId] })}
                  existingFiles={[]}
                  maxFiles={5 - (evidence?.length || 0)}
                />
              </div>
            )}

            {/* Escalation CTA — only when denied */}
            {dispute.status === 'denied' && !showEscalateForm && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Not satisfied with the seller's decision?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can escalate this dispute to Eclipse for an independent review. Our team will examine the evidence and make a final decision.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowEscalateForm(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-foreground"
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalate to Eclipse
                </Button>
              </div>
            )}

            {/* Escalation form */}
            {showEscalateForm && (
              <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <Label className="text-sm font-medium">Why are you escalating?</Label>
                <Textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Explain why you disagree with the seller's decision..."
                  className="min-h-[80px]"
                  maxLength={1000}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowEscalateForm(false); setEscalationReason(''); }}
                    disabled={escalateMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => escalateMutation.mutate()}
                    disabled={escalateMutation.isPending || !escalationReason.trim()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-foreground"
                  >
                    {escalateMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Escalating...</>
                    ) : (
                      <><ArrowUpRight className="h-4 w-4 mr-2" />Confirm Escalation</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Pending info */}
            {dispute.status === 'pending' && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-amber-500">Awaiting seller response.</strong> The seller has 48 hours to respond. If they don't, your dispute will be automatically escalated to Eclipse.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
