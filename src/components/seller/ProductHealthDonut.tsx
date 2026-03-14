import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { CheckCircle } from 'lucide-react';

const COLORS = [
  'hsl(142, 76%, 36%)',   // approved - green
  'hsl(45, 93%, 47%)',    // pending - yellow
  'hsl(0, 84%, 60%)',     // non-compliant - red
  'hsl(var(--muted-foreground))', // other
];

export function ProductHealthDonut() {
  const { store } = useSellerStatus();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-product-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data: products } = await supabase
        .from('products')
        .select('id, moderation_status, description, asset_file_url')
        .eq('store_id', store.id);

      if (!products || products.length === 0) return null;

      const approved = products.filter(p => p.moderation_status === 'approved').length;
      const pending = products.filter(p => p.moderation_status === 'pending').length;
      const rejected = products.filter(p => p.moderation_status === 'rejected').length;
      const other = products.length - approved - pending - rejected;
      const nonCompliant = products.filter(p => {
        const plainDesc = (p.description || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return plainDesc.length < 100 || !p.asset_file_url;
      }).length;

      const chartData = [];
      if (approved > 0) chartData.push({ name: 'Approved', value: approved });
      if (pending > 0) chartData.push({ name: 'Pending', value: pending });
      if (rejected > 0) chartData.push({ name: 'Rejected', value: rejected });
      if (other > 0) chartData.push({ name: 'Other', value: other });

      return { chartData, total: products.length, approved, pending, nonCompliant };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Product Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
        ) : data && data.chartData.length > 0 ? (
          <div>
            <RevolutDonutChart
              data={data.chartData}
              height={160}
              innerRadius={35}
              outerRadius={55}
              showLegend
              colors={COLORS}
            />
            <p className="text-center text-xs text-muted-foreground mt-2">
              {data.total} total · {data.approved} approved
            </p>
          </div>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            No products yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
