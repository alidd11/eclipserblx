import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { CheckCircle } from 'lucide-react';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

const COLORS = [
  'hsl(142, 76%, 36%)',   // approved - green
  'hsl(45, 93%, 47%)',    // pending - yellow
  'hsl(0, 84%, 60%)',     // rejected - red
  'hsl(var(--muted-foreground))', // other
];

export function ProductHealthDonut() {
  const { store } = useSellerStatus();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-product-health', store?.id],
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

      const chartData = [];
      if (approved > 0) chartData.push({ name: 'Approved', value: approved });
      if (pending > 0) chartData.push({ name: 'Pending', value: pending });
      if (rejected > 0) chartData.push({ name: 'Rejected', value: rejected });
      if (other > 0) chartData.push({ name: 'Other', value: other });

      return { chartData, total: products.length, approved, pending };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center gap-2 p-4 pb-2">
        <CheckCircle className="h-4 w-4" />
        <h3 className="text-base font-medium">Product Health</h3>
      </div>
      <div className="p-4 pt-0">
        {isLoading ? (
          <CardLoadingSkeleton rows={3} />
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
          <CardEmptyState icon={CheckCircle} title="No products yet" subtitle="Add products to see health status" />
        )}
      </div>
    </div>
  );
}
