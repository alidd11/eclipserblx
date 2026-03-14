import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/useCurrency';

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
    staleTime: 2 * 60 * 1000,
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

  const statusVariant = (s: string) => {
    if (s === 'completed') return 'default' as const;
    if (s === 'pending') return 'secondary' as const;
    return 'outline' as const;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Recent Orders
          </CardTitle>
          <Link to="/seller/orders" className="text-xs text-primary hover:underline">
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
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
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {orders.map((order) => (
                <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{order.description || 'Sale'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{fmt(order.net_amount || 0)}</p>
                    <Badge variant={statusVariant(order.status || 'pending')} className="text-[10px] h-5 mt-0.5">
                      {order.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[160px] flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No orders yet</p>
            <p className="text-xs mt-1">Orders will appear here as they come in</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
