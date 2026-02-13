import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, Clock, ArrowRight, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function PayoutTimeline() {
  const { store } = useSellerStatus();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['seller-payout-timeline', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('seller_payouts')
        .select('id, amount, status, created_at, completed_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!store?.id,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    processing: { icon: ArrowRight, color: 'text-blue-500', label: 'Processing' },
    failed: { icon: Wallet, color: 'text-red-500', label: 'Failed' },
    awaiting_funds: { icon: Clock, color: 'text-orange-500', label: 'Awaiting Funds' },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Payout History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
        ) : payouts && payouts.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {payouts.map((payout) => {
                const config = statusConfig[payout.status] || statusConfig.pending;
                const Icon = config.icon;

                return (
                  <div key={payout.id} className="flex items-start gap-3 relative">
                    <div className={cn('relative z-10 p-1 rounded-full bg-card border border-border', config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{formatCurrency(payout.amount)}</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(payout.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No payouts yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
