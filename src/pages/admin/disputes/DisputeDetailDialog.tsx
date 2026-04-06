import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, ShieldAlert, Shield,
  Snowflake, User, Store, Banknote, MessageSquare, ExternalLink, Timer,
  Loader2, FileImage, Calendar,
} from 'lucide-react';
import { format, formatDistanceToNow } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnrichedDispute } from './disputeTypes';
import { statusConfig, getDeadlineInfo, buildTimeline, getEscrowBadge } from './disputeHelpers';

interface Props {
  dispute: EnrichedDispute | null;
  onClose: () => void;
  adminResponse: string;
  onAdminResponseChange: (v: string) => void;
  newStatus: string;
  onNewStatusChange: (v: string) => void;
  onUpdate: () => void;
  isUpdating: boolean;
}

export function DisputeDetailDialog({
  dispute, onClose, adminResponse, onAdminResponseChange,
  newStatus, onNewStatusChange, onUpdate, isUpdating,
}: Props) {
  if (!dispute) return null;

  return (
    <Dialog open={!!dispute} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Dispute {dispute.dispute_number || 'Review'}
          </DialogTitle>
          <DialogDescription>
            Review dispute details, escrow status, and take action.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-2">
            {/* Quick info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <User className="h-3 w-3" /> Customer
                </div>
                <p className="text-sm font-medium truncate">{dispute.customer?.display_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground font-mono">{dispute.customer?.customer_id || '—'}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Store className="h-3 w-3" /> Store
                </div>
                <p className="text-sm font-medium truncate">{dispute.store?.name || '—'}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Banknote className="h-3 w-3" /> Amount
                </div>
                <p className="text-sm font-bold">£{Number(dispute.amount).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Calendar className="h-3 w-3" /> Filed
                </div>
                <p className="text-sm font-medium">{format(new Date(dispute.created_at), 'dd MMM yyyy')}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}</p>
              </div>
            </div>

            {/* Deadline + Linked Ticket row */}
            <div className="flex flex-wrap gap-2">
              {dispute.status === 'pending' && (() => {
                const { hoursLeft, isOverdue } = getDeadlineInfo(dispute.created_at);
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
              {dispute.linkedTicket && (
                <Link to={`/admin/customer-tickets`} onClick={onClose}>
                  <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20 cursor-pointer hover:bg-primary/10">
                    <ExternalLink className="h-3 w-3" />
                    Linked Ticket: {dispute.linkedTicket.ticket_number}
                  </Badge>
                </Link>
              )}
            </div>

            {/* Escrow Status Banner */}
            {dispute.escrow && (
              <div className={cn('border', dispute.escrow.escrow_frozen ? 'border-sky-500/30 bg-sky-500/5' : 'border-amber-500/20 bg-amber-500/5')}>
                <div className="p-4 py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {dispute.escrow.escrow_frozen ? (
                        <Snowflake className="h-4 w-4 text-sky-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {dispute.escrow.escrow_frozen
                            ? 'Escrow Frozen — Funds locked until resolution'
                            : dispute.escrow.escrow_released_at
                            ? 'Escrow Released — Funds paid to seller'
                            : `Escrow Hold — Releases ${formatDistanceToNow(new Date(dispute.escrow.escrow_hold_until!), { addSuffix: true })}`
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dispute.escrow.escrow_frozen
                            ? 'Dispute triggered automatic freeze. Resolve dispute to release or refund.'
                            : dispute.escrow.escrow_released_at
                            ? 'Manual recovery from seller may be needed if refund is approved.'
                            : 'Funds will auto-release after hold period if dispute is resolved.'
                          }
                        </p>
                      </div>
                    </div>
                    {getEscrowBadge(dispute)}
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              {(() => {
                const cfg = statusConfig[dispute.status] || statusConfig.pending;
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
                {buildTimeline(dispute).map((event, i) => (
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
              <p className="text-sm text-foreground">{dispute.reason}</p>
            </div>

            {dispute.details && (
              <div>
                <p className="text-sm font-medium mb-1.5">Additional Details</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground leading-relaxed">
                  {dispute.details}
                </div>
              </div>
            )}

            {/* Seller Response */}
            {dispute.seller_response && (
              <div>
                <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Seller Response
                  {dispute.seller_responded_at && (
                    <span className="text-xs text-muted-foreground font-normal">
                      — {formatDistanceToNow(new Date(dispute.seller_responded_at), { addSuffix: true })}
                    </span>
                  )}
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground leading-relaxed">
                  {dispute.seller_response}
                </div>
              </div>
            )}

            {/* Evidence */}
            <DisputeEvidenceSection disputeId={dispute.id} />

            {/* Escalation */}
            {dispute.escalation_reason && (
              <div className="border-amber-500/20 bg-amber-500/5">
                <div className="p-4 py-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium text-amber-600">Escalation Reason</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{dispute.escalation_reason}</p>
                  {dispute.escalated_at && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Escalated {formatDistanceToNow(new Date(dispute.escalated_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Previous admin response */}
            {dispute.admin_response && dispute.admin_resolved_at && (
              <div>
                <p className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Previous Admin Decision
                  <span className="text-xs text-muted-foreground font-normal">
                    — {formatDistanceToNow(new Date(dispute.admin_resolved_at), { addSuffix: true })}
                  </span>
                </p>
                <div className="rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground leading-relaxed">
                  {dispute.admin_response}
                </div>
              </div>
            )}

            <Separator />

            {/* Admin Actions */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Update Status</Label>
              <Select value={newStatus} onValueChange={onNewStatusChange}>
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
                onChange={(e) => onAdminResponseChange(e.target.value)}
                placeholder="Add your response or resolution notes..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={onUpdate}
                disabled={isUpdating || !newStatus}
              >
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Dispute
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
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
        {evidence.map((e) => (
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
