import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, CheckCircle, XCircle, Clock, ShieldAlert, Shield,
  Snowflake, Store, Timer, AlertCircle,
} from 'lucide-react';
import { differenceInHours, addHours, formatDistanceToNow } from '@/lib/dateUtils';
import type { EnrichedDispute } from './disputeTypes';

export const SELLER_DEADLINE_HOURS = 48;
export const PAGE_SIZE = 20;

export const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pending (Seller)' },
  approved: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle, label: 'Approved' },
  denied: { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle, label: 'Denied' },
  escalated: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: ShieldAlert, label: 'Escalated' },
  resolved: { color: 'bg-primary/10 text-primary border-primary/20', icon: Shield, label: 'Resolved' },
};

export function getDeadlineInfo(createdAt: string) {
  const deadline = addHours(new Date(createdAt), SELLER_DEADLINE_HOURS);
  const now = new Date();
  const hoursLeft = differenceInHours(deadline, now);
  const isOverdue = deadline < now;
  return { deadline, hoursLeft, isOverdue };
}

export function buildTimeline(d: EnrichedDispute) {
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

export function getEscrowBadge(d: EnrichedDispute) {
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
}

export function getDeadlineBadge(d: EnrichedDispute) {
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
}
