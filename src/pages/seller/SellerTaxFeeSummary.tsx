import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { RevolutBarChart } from '@/components/ui/revolut-chart';
import { Receipt, Percent, DollarSign, TrendingDown } from 'lucide-react';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { formatGBP } from '@/lib/formatters';

export default function SellerTaxFeeSummary() {
  const isInsideHub = useIsInsideHub();
  const { store } = useSellerStatus();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['seller-fee-summary', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('*')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const summary = useMemo(() => {
    let totalGross = 0, totalPlatformFee = 0, totalStripeFee = 0, totalNet = 0, refundCount = 0;
    transactions.forEach((t) => {
      totalGross += Number(t.gross_amount || t.amount || 0);
      totalPlatformFee += Number(t.platform_fee || 0);
      totalStripeFee += Number(t.stripe_fee || 0);
      totalNet += Number(t.net_amount || t.amount || 0);
    });
    return { totalGross, totalPlatformFee, totalStripeFee, totalNet, totalFees: totalPlatformFee + totalStripeFee };
  }, [transactions]);

  // Monthly breakdown for chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string, gross: number, platformFee: number, stripeFee: number, net: number }>();
    transactions.forEach((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map.has(key)) {
        map.set(key, { month: label, gross: 0, platformFee: 0, stripeFee: 0, net: 0 });
      }
      const entry = map.get(key)!;
      entry.gross += Number(t.gross_amount || t.amount || 0);
      entry.platformFee += Number(t.platform_fee || 0);
      entry.stripeFee += Number(t.stripe_fee || 0);
      entry.net += Number(t.net_amount || t.amount || 0);
    });
    return Array.from(map.values())
      .map(e => ({ ...e, gross: +e.gross.toFixed(2), platformFee: +e.platformFee.toFixed(2), stripeFee: +e.stripeFee.toFixed(2), net: +e.net.toFixed(2) }))
      .reverse();
  }, [transactions]);

  const effectiveRate = summary.totalGross > 0 ? ((summary.totalFees / summary.totalGross) * 100).toFixed(1) : '0';

  const cards = [
    { label: 'Gross Revenue', value: `{formatGBP(summary.totalGross)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Platform Commission', value: `{formatGBP(summary.totalPlatformFee)}`, icon: Percent, color: 'text-orange-500' },
    { label: 'Payment Processing', value: `{formatGBP(summary.totalStripeFee)}`, icon: Receipt, color: 'text-yellow-500' },
    { label: 'Net Earnings', value: `{formatGBP(summary.totalNet)}`, icon: TrendingDown, color: 'text-green-500' },
  ];

  return (
    <SellerLayout><div className="space-y-6">
      {!isInsideHub && (
        <div>
          <h1 className="text-2xl font-display font-bold">Tax & Fee Summary</h1>
          <p className="text-sm text-muted-foreground">Understand your platform fees, processing costs, and net earnings.</p>
        </div>
      )}

      {/* Inline Stats */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        {cards.map(card => (
          <span key={card.label} className="text-muted-foreground">
            {card.label}: <span className="font-semibold text-foreground">{card.value}</span>
          </span>
        ))}
      </div>

      {/* Effective fee rate */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="p-4 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Effective Fee Rate</p>
              <p className="text-xs text-muted-foreground">Combined platform + processing fees as a percentage of gross revenue</p>
            </div>
            <div className="text-3xl font-bold text-primary">{effectiveRate}%</div>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(Number(effectiveRate), 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Commission: £{summary.totalPlatformFee.toFixed(2)}</span>
            <span>Processing: £{summary.totalStripeFee.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Monthly breakdown chart */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-base">Monthly Fee Breakdown</h3></div>
        <div className="p-4">
          <div className="h-72">
            {monthlyData.length > 0 ? (
              <RevolutBarChart
                data={monthlyData}
                xKey="month"
                series={[
                  { dataKey: 'net', name: 'Net Earnings', color: 'hsl(262 100% 71%)' },
                  { dataKey: 'platformFee', name: 'Commission', color: 'hsl(220 95% 59%)' },
                  { dataKey: 'stripeFee', name: 'Processing', color: 'hsl(240 90% 65%)' },
                ]}
                height={288}
                yFormatter={(v) => `£${v}`}
                tooltipFormatter={(v) => [`{formatGBP(v)}`, '']}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No transaction data available yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div></SellerLayout>
  );
}
