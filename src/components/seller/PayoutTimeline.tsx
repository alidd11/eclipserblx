import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, Clock, ArrowRight, Wallet } from 'lucide-react';
import { formatDistanceToNow } formatRelative } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

export function PayoutTimeline() {
 const { store } = useSellerStatus();
 const { formatPrice: formatCurrency } = useCurrency();

 const { data: payouts, isLoading } = useQuery({
 queryKey: ['seller-payout-timeline', store?.id],
 queryFn: async () => {
 if (!store?.id) return [];
 const { data } = await supabase
 .from('seller_payouts_safe' as any)
 .select('id, amount, status, created_at, completed_at')
 .eq('store_id', store.id)
 .order('created_at', { ascending: false })
 .limit(6);
 return (data as any[]) || [];
 },
 enabled: !!store?.id,
 staleTime: 5 * 60 * 1000,
 });

 const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
 completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
 pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
 processing: { icon: ArrowRight, color: 'text-blue-500', label: 'Processing' },
 failed: { icon: Wallet, color: 'text-red-500', label: 'Failed' },
 awaiting_funds: { icon: Clock, color: 'text-orange-500', label: 'Awaiting Funds' },
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-base font-medium flex items-center gap-2">
 <DollarSign className="h-4 w-4" />
 Payout History
 </h3>
 </div>
 <div className="p-4">
 {isLoading ? (
 <CardLoadingSkeleton rows={4} />
 ) : payouts && payouts.length > 0 ? (
 <div className="relative">
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
 {formatRelative(payout.created_at)}
 </p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ) : (
 <CardEmptyState icon={DollarSign} title="No payouts yet" subtitle="Payouts will appear here once processed" />
 )}
 </div>
 </div>
 );
}
