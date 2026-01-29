import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Filter,
  X,
  Package
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  status: string;
  created_at: string;
  total: number;
  payment_method: string | null;
  order_items: {
    id: string;
    product_name: string;
    price: number;
  }[];
}

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
  const formatted = method
    .replace('stripe_', '')
    .replace('_', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  return formatted;
};

const formatOrderId = (id: string): string => {
  // Take last 6 chars and make uppercase
  return `#${id.slice(-6).toUpperCase()}`;
};

export default function Orders() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { data: orders, isLoading } = useQuery({
    queryKey: ['user-orders', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];

      let allOrders: Order[] = [];

      // Query by user_id
      const { data: userOrders, error: userError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          total,
          payment_method,
          order_items (
            id,
            product_name,
            price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!userError && userOrders) {
        allOrders = [...allOrders, ...(userOrders as Order[])];
      }

      // Also query by email for orders without user_id
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            total,
            payment_method,
            order_items (
              id,
              product_name,
              price
            )
          `)
          .eq('customer_email', user.email)
          .is('user_id', null)
          .order('created_at', { ascending: false });

        if (!emailError && emailOrders) {
          allOrders = [...allOrders, ...(emailOrders as Order[])];
        }
      }

      // Deduplicate by id
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.id === order.id)
      );

      return uniqueOrders;
    },
    enabled: !!(user?.id || user?.email),
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter(order => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query) ||
          formatOrderId(order.id).toLowerCase().includes(query);
        const matchesProduct = order.order_items.some(item =>
          item.product_name.toLowerCase().includes(query)
        );
        if (!matchesId && !matchesProduct) return false;
      }

      // Status filter
      if (statusFilter && order.status !== statusFilter) return false;

      // Date range filter
      if (dateRange.from) {
        const orderDate = new Date(order.created_at);
        if (orderDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const orderDate = new Date(order.created_at);
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        if (orderDate > endOfDay) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setDateRange({});
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || statusFilter || dateRange.from || dateRange.to;

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your orders.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">My Orders</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View and manage your orders.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-muted/50 border-border"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-dashed gap-1.5",
                    statusFilter && "border-primary text-primary"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Status
                  {statusFilter && (
                    <span className="ml-1 capitalize">: {statusFilter}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="space-y-1">
                  {['paid', 'completed', 'pending', 'refunded'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start capitalize"
                      onClick={() => handleStatusFilter(statusFilter === status ? null : status)}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full mr-2",
                        statusColors[status]?.dot || 'bg-muted-foreground'
                      )} />
                      {status}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-dashed gap-1.5",
                    (dateRange.from || dateRange.to) && "border-primary text-primary"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Date
                  {dateRange.from && (
                    <span className="ml-1">
                      : {format(dateRange.from, 'MMM d')}
                      {dateRange.to && ` - ${format(dateRange.to, 'MMM d')}`}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => handleDateRangeChange(range || {})}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">
                  {hasActiveFilters ? 'No orders match your filters' : 'No orders yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasActiveFilters 
                    ? 'Try adjusting your search or filters' 
                    : 'Your orders will appear here after purchase'}
                </p>
              </div>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/products">Browse Products</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {paginatedOrders.map((order) => {
                const statusStyle = statusColors[order.status] || statusColors.pending;
                const displayStatus = order.status === 'paid' ? 'Completed' : 
                  order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ');

                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Order Header */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-primary text-sm font-medium">Order ID: </span>
                          <span className="font-semibold">{formatOrderId(order.id)}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
                        statusStyle.bg,
                        statusStyle.text
                      )}>
                        <span className={cn("w-2 h-2 rounded-full", statusStyle.dot)} />
                        {displayStatus}
                      </div>

                      {/* View Order Button */}
                      <Button
                        asChild
                        variant="outline"
                        className="w-full"
                      >
                        <Link to={`/order-success?order_id=${order.id}`}>
                          View order
                        </Link>
                      </Button>
                    </div>

                    {/* Order Details */}
                    <div className="border-t border-border p-4 space-y-2 bg-muted/30">
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">Order Date:</span>
                        <span className="text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">Total:</span>
                        <span className="text-muted-foreground">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-primary font-medium">Payment Method:</span>
                        <span className="text-muted-foreground">
                          {formatPaymentMethod(order.payment_method)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
