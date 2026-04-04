import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { OrdersTab } from '@/components/seller/orders/OrdersTab';
import { TransactionsTab } from '@/components/seller/orders/TransactionsTab';

export default function SellerOrders() {
  const { store } = useSellerStatus();
  const [ordersTab, setOrdersTab] = useState('orders');

  const { data: stats } = useQuery({
    queryKey: ['seller-order-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { totalSales: 0, totalRevenue: 0, pendingAmount: 0 };
      
      const { data } = await supabase
        .from('seller_transactions')
        .select('type, status, net_amount')
        .eq('store_id', store.id);

      const txs = data || [];
      return {
        totalSales: txs.filter(t => t.type === 'sale').length,
        totalRevenue: txs.reduce((sum, t) => t.type === 'sale' ? sum + (t.net_amount || 0) : sum, 0),
        pendingAmount: txs.reduce((sum, t) => t.status === 'pending' ? sum + (t.net_amount || 0) : sum, 0),
      };
    },
    enabled: !!store?.id,
    staleTime: 60000,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  return (
    <SellerLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Orders & Transactions</h1>
          <p className="text-sm text-muted-foreground">Track your sales, orders, and transaction history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Sales', value: stats?.totalSales || 0, icon: ShoppingCart, sub: 'Completed orders', color: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
            { label: 'Revenue', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, sub: 'After fees', color: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-500' },
            { label: 'Pending', value: formatCurrency(stats?.pendingAmount || 0), icon: TrendingUp, sub: 'Awaiting clearance', color: 'from-yellow-500/20 to-yellow-500/5', iconColor: 'text-yellow-500' },
          ].map(stat => (
            <div key={stat.label} className="relative rounded-xl border border-border/50 bg-card p-4 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br opacity-40 rounded-xl ${stat.color}`} />
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center mb-2 border border-border/30">
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabbed Content */}
        <Tabs value={ordersTab} onValueChange={setOrdersTab} className="space-y-4">
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          <div className="sm:hidden">
            <Select value={ordersTab} onValueChange={setOrdersTab}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsContent value="orders">
            {store?.id && <OrdersTab storeId={store.id} />}
          </TabsContent>
          <TabsContent value="transactions">
            {store?.id && <TransactionsTab storeId={store.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
