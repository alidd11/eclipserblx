import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GracePeriodBannerProps {
  gracePeriodEndsAt: string;
  onUpdatePayment: () => void;
}

export function GracePeriodBanner({ gracePeriodEndsAt, onUpdatePayment }: GracePeriodBannerProps) {
  const endsAt = new Date(gracePeriodEndsAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-400">
          Payment failed — {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left to keep Pro
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Update your payment method before {endsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} or your Pro features will be downgraded.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        onClick={onUpdatePayment}
      >
        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
        Update
      </Button>
    </div>
  );
}
