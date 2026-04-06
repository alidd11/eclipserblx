import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { Globe } from 'lucide-react';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

const COLORS = [
 'hsl(var(--primary))',
 'hsl(var(--muted-foreground))',
 'hsl(142, 76%, 36%)',
 'hsl(45, 93%, 47%)',
 'hsl(24, 95%, 53%)',
 'hsl(263, 70%, 50%)',
];

export function CustomerDemographics() {
 const { store } = useSellerStatus();

 const { data: countryData, isLoading } = useQuery({
 queryKey: ['seller-demographics', store?.id],
 queryFn: async () => {
 if (!store?.id) return [];

 const { data: transactions } = await supabase
 .from('seller_transactions')
 .select('metadata')
 .eq('store_id', store.id)
 .eq('type', 'sale')
 .is('refunded_at', null)
 .not('metadata', 'is', null)
 .limit(200);

 const countryMap = new Map<string, number>();
 transactions?.forEach((t) => {
 const country = t.metadata?.country || t.metadata?.buyer_country || 'Unknown';
 countryMap.set(country, (countryMap.get(country) || 0) + 1);
 });

 if (countryMap.size === 0) {
 const { data: visits } = await supabase
 .from('page_visits')
 .select('country')
 .like('page_path', `%/store/${store.slug}%`)
 .not('country', 'is', null)
 .limit(200);

 visits?.forEach((v) => {
 const country = v.country || 'Unknown';
 countryMap.set(country, (countryMap.get(country) || 0) + 1);
 });
 }

 if (countryMap.size === 0) return [];

 const sorted = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]);
 const top5 = sorted.slice(0, 5);
 const otherCount = sorted.slice(5).reduce((sum, [, count]) => sum + count, 0);

 const result = top5.map(([name, value]) => ({ name, value }));
 if (otherCount > 0) result.push({ name: 'Other', value: otherCount });

 return result;
 },
 enabled: !!store?.id,
 staleTime: 10 * 60 * 1000,
 });

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-base font-medium flex items-center gap-2">
 <Globe className="h-4 w-4" />
 Visitor Countries
 </h3>
 </div>
 <div className="p-4">
 {isLoading ? (
 <CardLoadingSkeleton rows={3} />
 ) : countryData && countryData.length > 0 ? (
 <RevolutDonutChart
 data={countryData}
 height={200}
 innerRadius={30}
 outerRadius={55}
 showLegend
 colors={COLORS}
 />
 ) : (
 <CardEmptyState icon={Globe} title="No visitor data yet" subtitle="Country data appears as your store gets traffic" />
 )}
 </div>
 </div>
 );
}
