import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Package, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { ORDER_STATUSES } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { formatGBP } from '@/lib/formatters';

const ORDERS_PER_PAGE = 20;

export default function AdminOrders() {
 const { user } = useAuth();
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 300);
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [selectedOrder, setSelectedOrder] = useState<any>(null);
 const [currentPage, setCurrentPage] = useState(1);
 
 // Check if current user is admin (role-based)
 const { isPrimaryAdmin } = useAdminAuth();
 const queryClient = useQueryClient();

 // Get total count for pagination
 const { data: totalCount } = useQuery({
 queryKey: ['admin-orders-count', statusFilter],
 queryFn: async () => {
 let query = supabase
 .from('orders')
 .select('*', { count: 'exact', head: true });

 if (statusFilter !== 'all') query = query.eq('status', statusFilter);

 const { count, error } = await query;
 if (error) throw error;
 return count || 0;
 },
 staleTime: 2 * 60_000,
 });

 const { data: orders, isLoading } = useQuery({
 queryKey: ['admin-orders', debouncedSearch, statusFilter, currentPage],
 queryFn: async () => {
 const from = (currentPage - 1) * ORDERS_PER_PAGE;
 const to = from + ORDERS_PER_PAGE - 1;

 let query = supabase
 .from('orders')
 .select(`*, order_items(*, products(name, stores(name)))`)
 .order('created_at', { ascending: false })
 .range(from, to);

 if (statusFilter !== 'all') query = query.eq('status', statusFilter);

 const { data, error } = await query;
 if (error) throw error;
 
 // If searching, filter by user's customer_id from profiles
 if (debouncedSearch && data) {
 const userIds = data.filter(o => o.user_id).map(o => o.user_id) as string[];
 if (userIds.length > 0) {
 const { data: profiles } = await supabase
 .from('profiles')
 .select('user_id, customer_id')
 .in('user_id', userIds);
 
 const customerIdMap = new Map(profiles?.map(p => [p.user_id, p.customer_id]) || []);
 
 return data.filter(order => {
 const customerId = order.user_id ? customerIdMap.get(order.user_id) : null;
 return customerId?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
 order.id.toLowerCase().includes(debouncedSearch.toLowerCase());
 });
 }
 }
 
 return data;
 },
 staleTime: 10000,
 });

 const totalPages = Math.ceil((totalCount || 0) / ORDERS_PER_PAGE);
 
 // Fetch customer IDs for orders
 const orderUserIds = (orders?.filter(o => o.user_id).map(o => o.user_id) || []) as string[];
 const { data: customerProfiles } = useQuery({
 queryKey: ['order-customer-profiles', orderUserIds],
 queryFn: async () => {
 if (orderUserIds.length === 0) return {};
 const { data, error } = await supabase
 .from('profiles')
 .select('user_id, customer_id')
 .in('user_id', orderUserIds);
 if (error) throw error;
 const map: Record<string, string | null> = {};
 data?.forEach(p => { map[p.user_id] = p.customer_id; });
 return map;
 },
 enabled: orderUserIds.length > 0,
 });
 
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const getCustomerId = (order: any) => {
 if (order.user_id && customerProfiles?.[order.user_id]) {
 return customerProfiles[order.user_id];
 }
 return order.id.slice(0, 8).toUpperCase();
 };

 const updateStatusMutation = useMutation({
 mutationFn: async ({ id, status }: { id: string; status: string }) => {
 const { error } = await supabase.from('orders').update({ status }).eq('id', id);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
 showSuccessNotification('Status Updated', 'Order status changed');
 },
 onError: (error: Error) => {
 showErrorNotification('Update Failed', error.message);
 },
 });

 const deleteOrderMutation = useMutation({
 mutationFn: async (orderId: string) => {
 // First delete order items
 const { error: itemsError } = await supabase
 .from('order_items')
 .delete()
 .eq('order_id', orderId);
 if (itemsError) throw itemsError;
 
 // Then delete the order
 const { error } = await supabase.from('orders').delete().eq('id', orderId);
 if (error) throw error;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
 setSelectedOrder(null);
 showSuccessNotification('Order Deleted', 'Order has been removed');
 },
 onError: (error: Error) => {
 showErrorNotification('Delete Failed', error.message);
 },
 });

 const getStatusBadge = (status: string) => {
 const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
 if (!config) return <Badge variant="outline">{status}</Badge>;

 const colorMap: Record<string, string> = {
 success: 'bg-green-500/10 text-green-500 border-green-500/30',
 warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
 destructive: 'bg-red-500/10 text-red-500 border-red-500/30',
 primary: 'bg-primary/10 text-primary border-primary/30',
 muted: 'bg-muted text-muted-foreground',
 };

 return (
 <Badge variant="outline" className={colorMap[config.color] || colorMap.muted}>
 {config.label}
 </Badge>
 );
 };

 return (
 <AdminLayout requiredPermissions={['view_orders']}>
  <div className="space-y-4">
  <AdminPageHeader title="Orders" description="Manage customer orders" />

 <div className="flex flex-col sm:flex-row gap-4">
 <div className="relative w-full sm:max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search by Customer ID..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-10"
 />
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-auto min-w-[140px]">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Statuses</SelectItem>
 {Object.entries(ORDER_STATUSES).map(([key, { label }]) => (
 <SelectItem key={key} value={key}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Mobile Card View */}
 <div className="block md:hidden space-y-2">
 {isLoading ? (
 <div className="space-y-2">
 {Array.from({ length: 3 }).map((_, i) => (
 <Skeleton key={i} className="h-20" />
 ))}
 </div>
 ) : orders?.length === 0 ? (
 <p className="text-center py-8 text-muted-foreground">No orders found</p>
 ) : (
 <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
 {orders?.map((order) => (
 <button key={order.id} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left" onClick={() => setSelectedOrder(order)}>
 <div className="min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <span className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</span>
 {getStatusBadge(order.status)}
 </div>
 <p className="text-xs text-muted-foreground font-mono">{getCustomerId(order)}</p>
 <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()} · {formatGBP(order.total)}</p>
 </div>
 <Eye className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Desktop Table View */}
 <div className="hidden md:block border border-border rounded-xl overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow className="hover:bg-transparent bg-muted/30">
 <TableHead>Order ID</TableHead>
 <TableHead>Customer</TableHead>
 <TableHead>Date</TableHead>
 <TableHead>Total</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <>
 {Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i}>
 {Array.from({ length: 6 }).map((_, j) => (
 <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
 ))}
 </TableRow>
 ))}
 </>
 ) : orders?.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
 No orders found
 </TableCell>
 </TableRow>
 ) : (
 orders?.map((order) => (
 <TableRow key={order.id}>
 <TableCell className="font-mono text-sm">
 {order.id.slice(0, 8).toUpperCase()}
 </TableCell>
 <TableCell className="font-mono">{getCustomerId(order)}</TableCell>
 <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
 <TableCell>{formatGBP(order.total)}</TableCell>
 <TableCell>{getStatusBadge(order.status)}</TableCell>
 <TableCell className="text-right">
 <Button variant="ghost" size="icon" aria-label="View" onClick={() => setSelectedOrder(order)}>
 <Eye className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between">
 <p className="text-sm text-muted-foreground">
 Page {currentPage} of {totalPages} ({totalCount} orders)
 </p>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
 <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
 </div>
 </div>
 )}
 </div>

 {/* Order Detail Dialog */}
 <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <Package className="h-5 w-5" />
 Order {selectedOrder?.id.slice(0, 8).toUpperCase()}
 </DialogTitle>
 </DialogHeader>

 {selectedOrder && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-muted-foreground">Customer ID</p>
 <p className="font-medium font-mono">{getCustomerId(selectedOrder)}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Date</p>
 <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Payment Method</p>
 <p className="font-medium capitalize">{selectedOrder.payment_method || '—'}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Total</p>
 <p className="font-bold text-lg">{formatGBP(selectedOrder.total)}</p>
 </div>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-2">Items</p>
 <div className="space-y-2">
 {selectedOrder.order_items?.map((item: any) => (
 <div key={item.id} className="flex justify-between items-start p-2 bg-muted/50 rounded">
 <div className="min-w-0">
 <span className="block">{item.product_name}</span>
 {item.products?.stores?.name && (
 <span className="text-xs text-muted-foreground">{item.products.stores.name}</span>
 )}
 </div>
 <span className="font-medium shrink-0 ml-2">{formatGBP(item.price)}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="flex gap-4 items-end">
 <div className="flex-1">
 <p className="text-sm text-muted-foreground mb-2">Update Status</p>
 <Select
 value={selectedOrder.status}
 onValueChange={(status) => {
 updateStatusMutation.mutate({ id: selectedOrder.id, status });
 setSelectedOrder({ ...selectedOrder, status });
 }}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.entries(ORDER_STATUSES).map(([key, { label }]) => (
 <SelectItem key={key} value={key}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {isPrimaryAdmin && (
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <Button variant="destructive" size="icon" aria-label="Delete">
 <Trash2 className="h-4 w-4" />
 </Button>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Delete Order</AlertDialogTitle>
 <AlertDialogDescription>
 Are you sure you want to delete this order? This action cannot be undone and will remove all associated order items.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Cancel</AlertDialogCancel>
 <AlertDialogAction
 onClick={() => deleteOrderMutation.mutate(selectedOrder.id)}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
 >
 Delete
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 )}
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </AdminLayout>
 );
}
