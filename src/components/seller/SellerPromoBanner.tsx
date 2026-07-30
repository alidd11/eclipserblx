import { Gift, Clock } from 'lucide-react';

interface SellerPromoBannerProps {
  freePromoEndsAt: string;
}

export function SellerPromoBanner({ freePromoEndsAt }: SellerPromoBannerProps) {
  return (
    <div className="rounded-xl border border-success/20 bg-success/5 p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-success/10 shrink-0">
        <Gift className="h-4 w-4 text-success" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-success">🎉 0% Commission — First 30 Days Free!</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3" />
          Ends {new Date(freePromoEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — keep 100% of every sale
        </p>
      </div>
    </div>
  );
}
