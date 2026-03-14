import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { Globe } from 'lucide-react';

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

      // Get orders for this store with country info from page_visits or order metadata
      const { data: transactions } = await supabase
        .from('seller_transactions')
        .select('metadata')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .not('metadata', 'is', null)
        .limit(200);

      // Count countries from transaction metadata
      const countryMap = new Map<string, number>();
      transactions?.forEach((t: any) => {
        const country = t.metadata?.country || t.metadata?.buyer_country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });

      // If no country data, show store page visits instead
      if (countryMap.size === 0) {
        const { data: visits } = await supabase
          .from('page_visits')
          .select('country')
          .like('page_path', `%/store/${store.slug}%`)
          .not('country', 'is', null)
          .limit(200);

        visits?.forEach((v: any) => {
          const country = v.country || 'Unknown';
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
        });
      }

      if (countryMap.size === 0) return [];

      // Sort by count, take top 5, group rest as "Other"
      const sorted = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]);
      const top5 = sorted.slice(0, 5);
      const otherCount = sorted.slice(5).reduce((sum, [, count]) => sum + count, 0);

      const result = top5.map(([name, value]) => ({ name, value }));
      if (otherCount > 0) result.push({ name: 'Other', value: otherCount });

      return result;
    },
    enabled: !!store?.id,
  });

  

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Visitor Countries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
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
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No visitor data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
