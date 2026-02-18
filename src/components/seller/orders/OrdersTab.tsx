import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, ChevronLeft, ChevronRight, ShoppingCart, Download, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ORDERS_PER_PAGE = 20;

interface OrdersTabProps {
  storeId: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
      return <Badge variant="default" className="bg-green-600">Completed</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Refunded</Badge>;
    case 'partially_refunded':
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Partial Refund</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function OrdersTab({ storeId }: OrdersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch orders that contain products from this store
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['seller-orders', storeId, currentPage, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const from = (currentPage - 1) * ORDERS_PER_PAGE;
      const to = from + ORDERS_PER_PAGE - 1;

      // Get order IDs that have items belonging to this store's products
      let query = supabase
        .from('seller_transactions')
        .select('order_id')
        .eq('store_id', storeId)
        .eq('type', 'sale')
        .not('order_id', 'is', null);

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data: txData } = await query;
      const orderIds = [...new Set((txData || []).map(t => t.order_id).filter(Boolean))];

      if (orderIds.length === 0) return { orders: [], totalCount: 0 };

      let ordersQuery = supabase
        .from('orders')
        .select('*, order_items(id, product_name, price, product_id)', { count: 'exact' })
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        ordersQuery = ordersQuery.eq('status', statusFilter);
      }

      const { data, count, error } = await ordersQuery.range(from, to);
      if (error) throw error;
      return { orders: data || [], totalCount: count || 0 };
    },
    enabled: !!storeId,
    staleTime: 30000,
  });

  // Fetch order detail with seller transactions
  const { data: orderDetail } = useQuery({
    queryKey: ['seller-order-detail', selectedOrder?.id, storeId],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      const { data } = await supabase
        .from('seller_transactions')
        .select('*')
        .eq('order_id', selectedOrder.id)
        .eq('store_id', storeId);
      return data || [];
    },
    enabled: !!selectedOrder?.id,
  });

  const orders = ordersData?.orders || [];
  const totalCount = ordersData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE);

  const filteredOrders = orders.filter((o: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.customer_email?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q) ||
      o.order_items?.some((i: any) => i.product_name?.toLowerCase().includes(q));
  });

  const exportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Items', 'Total', 'Status'];
    const rows = filteredOrders.map((o: any) => [
      o.id,
      format(new Date(o.created_at), 'yyyy-MM-dd HH:mm'),
      o.customer_email,
      (o.order_items || []).map((i: any) => i.product_name).join('; '),
      o.total,
      o.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, order ID, or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="w-[140px]" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="w-[140px]" />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredOrders.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Orders containing your products ({totalCount} total)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(order.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{order.customer_email}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {(order.order_items || []).slice(0, 2).map((item: any) => (
                            <p key={item.id} className="text-sm truncate max-w-[200px]">{item.product_name}</p>
                          ))}
                          {(order.order_items || []).length > 2 && (
                            <p className="text-xs text-muted-foreground">+{order.order_items.length - 2} more</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">Orders containing your products will appear here.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono text-xs">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{format(new Date(selectedOrder.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p>{selectedOrder.customer_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Order Total</p>
                  <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="text-red-600">-{formatCurrency(selectedOrder.discount_amount)}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Items in this order</h4>
                <div className="space-y-2">
                  {(selectedOrder.order_items || []).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                      <span className="text-sm">{item.product_name}</span>
                      <span className="text-sm font-medium">{formatCurrency(item.price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {orderDetail && orderDetail.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Your earnings from this order</h4>
                  <div className="space-y-2">
                    {orderDetail.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50 text-sm">
                        <div>
                          <p>{tx.description || 'Sale'}</p>
                          <p className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(tx.platform_fee || 0)}
                            {tx.stripe_fee ? ` + Stripe: ${formatCurrency(tx.stripe_fee)}` : ''}
                          </p>
                        </div>
                        <span className="font-medium text-green-600">+{formatCurrency(tx.net_amount || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOrder.refunded_at && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm">
                  <p className="font-medium text-destructive">Refunded</p>
                  <p className="text-muted-foreground">
                    {selectedOrder.refund_amount ? formatCurrency(selectedOrder.refund_amount) : 'Full refund'} on {format(new Date(selectedOrder.refunded_at), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
