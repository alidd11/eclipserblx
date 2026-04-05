import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        <div className="mb-4">
          <h1 className="text-2xl font-display font-bold">Orders & Transactions</h1>
          <p className="text-sm text-muted-foreground">Track your sales, orders, and transaction history</p>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm mb-6 flex-wrap">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{stats?.totalSales || 0}</span> sales
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-green-500">{formatCurrency(stats?.totalRevenue || 0)}</span> revenue
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-yellow-500">{formatCurrency(stats?.pendingAmount || 0)}</span> pending
          </span>
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
