import { Link } from 'react-router-dom';
import { OrdersListSkeleton } from '@/components/purchases/PurchasesSkeletons';
import {
  Package, Search, Calendar, Filter, X, AlertTriangle, ShieldAlert, Clock, Shield, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from '@/lib/dateUtils';
import { OrderTimeline } from '@/components/purchases/OrderTimeline';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  paid: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  completed: { bg: 'bg-green-500/10', text: 'text-green-500', dot: 'bg-green-500' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', dot: 'bg-yellow-500' },
  refunded: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  partially_refunded: { bg: 'bg-orange-500/10', text: 'text-orange-500', dot: 'bg-orange-500' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
};

const formatPaymentMethod = (method: string | null): string => {
  if (!method) return 'Card';
  return method.replace('stripe_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatOrderId = (id: string): string => `#${id.slice(-6).toUpperCase()}`;

interface OrdersTabProps {
  isLoading: boolean;
  filteredOrders: any[];
  paginatedOrders: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string | null;
  setStatusFilter: (s: string | null) => void;
  dateRange: { from?: Date; to?: Date };
  setDateRange: (r: { from?: Date; to?: Date }) => void;
  ordersPage: number;
  ordersTotalPages: number;
  setOrdersPage: (fn: (p: number) => number) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  disputesByOrder: Record<string, { id: string; status: string; amount: number; dispute_number: string }>;
  setDisputeOrder: (o: { id: string; displayId: string } | null) => void;
  setViewingDisputeId: (id: string | null) => void;
  formatPrice: (n: number) => string;
}

const getDisputeBadge = (status: string) => {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1 text-xs"><Clock className="h-3 w-3" />Dispute Pending</Badge>;
    case 'denied': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-xs"><X className="h-3 w-3" />Dispute Denied</Badge>;
    case 'escalated': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-xs"><ShieldAlert className="h-3 w-3" />Escalated</Badge>;
    case 'approved': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 text-xs"><Check className="h-3 w-3" />Refund Approved</Badge>;
    case 'resolved': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs"><Shield className="h-3 w-3" />Resolved</Badge>;
    default: return null;
  }
};

export function OrdersTab({
  isLoading,
  filteredOrders,
  paginatedOrders,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  ordersPage,
  ordersTotalPages,
  setOrdersPage,
  hasActiveFilters,
  clearFilters,
  disputesByOrder,
  setDisputeOrder,
  setViewingDisputeId,
  formatPrice,
}: OrdersTabProps) {
  return (
    <>
      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order ID or product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted/50 border-border" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("border-dashed gap-1.5", statusFilter && "border-primary text-primary")}>
                <Filter className="h-3.5 w-3.5" />Status{statusFilter && <span className="ml-1 capitalize">: {statusFilter}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {['paid', 'completed', 'pending', 'refunded'].map((status) => (
                  <Button key={status} variant={statusFilter === status ? 'secondary' : 'ghost'} size="sm" className="w-full justify-start capitalize" onClick={() => setStatusFilter(statusFilter === status ? null : status)}>
                    <span className={cn("w-2 h-2 rounded-full mr-2", statusColors[status]?.dot || 'bg-muted-foreground')} />{status}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("border-dashed gap-1.5", (dateRange.from || dateRange.to) && "border-primary text-primary")}>
                <Calendar className="h-3.5 w-3.5" />Date
                {dateRange.from && <span className="ml-1">: {format(dateRange.from, 'MMM d')}{dateRange.to && ` - ${format(dateRange.to, 'MMM d')}`}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent initialFocus mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => setDateRange(range || {})} numberOfMonths={1} />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <OrdersListSkeleton />
      ) : filteredOrders.length === 0 ? (
        <div className="border border-border rounded-xl overflow-hidden border-border bg-card">
          <div className="p-4 py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{hasActiveFilters ? 'No orders match your filters' : 'No orders yet'}</p>
              <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters ? 'Try adjusting your search or filters' : 'Your orders will appear here after purchase'}</p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            ) : (
              <Button asChild variant="outline"><Link to="/products">Browse Products</Link></Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map((order) => {
              const statusStyle = statusColors[order.status] || statusColors.pending;
              const displayStatus = order.status === 'paid' ? 'Completed' : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ');

              return (
                <div key={order.id} className="rounded-lg border border-border bg-card overflow-hidden hover:border-muted-foreground/30 transition-colors">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-primary text-sm font-medium">Order ID: </span>
                        <span className="font-semibold">{formatOrderId(order.id)}</span>
                      </div>
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium", statusStyle.bg, statusStyle.text)}>
                        <span className={cn("w-2 h-2 rounded-full", statusStyle.dot)} />
                        {displayStatus}
                      </div>
                    </div>
                    {disputesByOrder[order.id] && (
                      <button
                        onClick={() => setViewingDisputeId(disputesByOrder[order.id].id)}
                        className="w-full flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        {getDisputeBadge(disputesByOrder[order.id].status)}
                        <span className="text-xs text-muted-foreground">View details →</span>
                      </button>
                    )}
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link to={`/order-success?order_id=${order.id}`}>View order</Link>
                      </Button>
                      {['paid', 'completed'].includes(order.status) && !disputesByOrder[order.id] && (
                        <Button
                          variant="outline"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => setDisputeOrder({ id: order.id, displayId: formatOrderId(order.id) })}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Dispute
                        </Button>
                      )}
                      {disputesByOrder[order.id] && (
                        <Button variant="outline" onClick={() => setViewingDisputeId(disputesByOrder[order.id].id)}>
                          <ShieldAlert className="h-4 w-4 mr-2" />
                          Track
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border/50 px-4 pt-2 bg-muted/20">
                    <OrderTimeline status={order.status} createdAt={order.created_at} paymentMethod={order.payment_method} />
                  </div>
                  <div className="px-4 pb-4 space-y-2 bg-muted/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium">Order Date:</span>
                      <span className="text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium">Total:</span>
                      <span className="text-muted-foreground">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium">Payment:</span>
                      <span className="text-muted-foreground">{formatPaymentMethod(order.payment_method)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {ordersTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.max(1, p - 1))} disabled={ordersPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">Page {ordersPage} of {ordersTotalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))} disabled={ordersPage === ordersTotalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
