import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Receipt, Percent, DollarSign, TrendingDown } from 'lucide-react';

export default function SellerTaxFeeSummary() {
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
    transactions.forEach((t: any) => {
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
    transactions.forEach((t: any) => {
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
    { label: 'Gross Revenue', value: `£${summary.totalGross.toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Platform Commission', value: `£${summary.totalPlatformFee.toFixed(2)}`, icon: Percent, color: 'text-orange-500' },
    { label: 'Payment Processing', value: `£${summary.totalStripeFee.toFixed(2)}`, icon: Receipt, color: 'text-yellow-500' },
    { label: 'Net Earnings', value: `£${summary.totalNet.toFixed(2)}`, icon: TrendingDown, color: 'text-green-500' },
  ];

  return (
    <SellerLayout><div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Tax & Fee Summary</h1>
        <p className="text-sm text-muted-foreground">Understand your platform fees, processing costs, and net earnings.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><card.icon className={`h-5 w-5 ${card.color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Effective fee rate */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Monthly breakdown chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Fee Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `£${v}`} />
                  <Tooltip formatter={(v: number) => `£${v.toFixed(2)}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="net" name="Net Earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="platformFee" name="Commission" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stripeFee" name="Processing" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No transaction data available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div></SellerLayout>
  );
}
