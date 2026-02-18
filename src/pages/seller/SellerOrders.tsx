import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { OrdersTab } from '@/components/seller/orders/OrdersTab';
import { TransactionsTab } from '@/components/seller/orders/TransactionsTab';

export default function SellerOrders() {
  const { store } = useSellerStatus();

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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Orders & Transactions</h1>
          <p className="text-muted-foreground">Track your sales, orders, and transaction history</p>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible">
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
              <p className="text-xs text-muted-foreground">Completed orders</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">After platform fees</p>
            </CardContent>
          </Card>
          <Card className="min-w-[160px] flex-shrink-0 md:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.pendingAmount || 0)}</div>
              <p className="text-xs text-muted-foreground">Awaiting clearance</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
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
