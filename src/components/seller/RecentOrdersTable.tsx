import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export function RecentOrdersTable() {
  const { store } = useSellerStatus();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-recent-orders-table', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('seller_transactions')
        .select('id, created_at, description, net_amount, gross_amount, status, refunded_at')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!store?.id,
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

  const statusVariant = (s: string) => {
    if (s === 'completed') return 'default';
    if (s === 'pending') return 'secondary';
    return 'outline';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Recent Orders
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
        ) : orders && orders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs text-right">Earned</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
                <TableHead className="text-xs text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-sm truncate max-w-[160px]">
                    {order.description || 'Sale'}
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {fmt(order.net_amount || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(order.status || 'pending')} className="text-[10px] h-5">
                      {order.status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No orders yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
