import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Globe } from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#8b5cf6',
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

  const total = countryData?.reduce((s, d) => s + d.value, 0) || 0;

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
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={countryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {countryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {countryData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate">{entry.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No visitor data yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
