import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Store, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  Copy,
  ExternalLink,
  LayoutGrid
} from 'lucide-react';

export default function SellerDashboard() {
  const { store, balance } = useSellerStatus();

  // Fetch recent orders for this seller
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-recent-orders', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('*')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch product stats
  const { data: productStats, isLoading: statsLoading } = useQuery({
    queryKey: ['seller-product-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { total: 0, pending: 0, approved: 0 };
      
      const { data, error } = await supabase
        .from('products')
        .select('id, moderation_status')
        .eq('store_id', store.id);

      if (error) throw error;
      
      const products = data || [];
      return {
        total: products.length,
        pending: products.filter(p => p.moderation_status === 'pending').length,
        approved: products.filter(p => p.moderation_status === 'approved').length,
      };
    },
    enabled: !!store?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const storeUrl = store?.slug ? `${window.location.origin}/store/${store.slug}` : '';

  const copyStoreLink = () => {
    if (storeUrl) {
      navigator.clipboard.writeText(storeUrl);
      toast.success('Store link copied to clipboard!');
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Store className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{store?.name}</h1>
              {store?.is_verified && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Manage your store, products, and earnings
            </p>
          </div>
          <Button asChild>
            <Link to="/seller/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>

        {/* Store Link Card */}
        {storeUrl && (
          <Card className="mb-6 bg-primary/5 border-primary/20 overflow-hidden">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-muted-foreground">Your Store Link</p>
                  <p className="text-sm font-mono truncate max-w-full">{storeUrl}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={copyStoreLink} className="flex-1 sm:flex-initial">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="default" size="sm" asChild className="flex-1 sm:flex-initial">
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg sm:text-2xl font-bold truncate">
                {formatCurrency(store?.total_revenue || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Lifetime earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium">Available Balance</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                {formatCurrency(balance?.available_balance || 0)}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Ready for payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg sm:text-2xl font-bold">
                {store?.total_sales || 0}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Products sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium">Products</CardTitle>
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-lg sm:text-2xl font-bold">
                {statsLoading ? '...' : productStats?.total || 0}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {productStats?.pending || 0} pending review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for managing your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/seller/products">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Manage Products
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/seller/orders">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    View Orders
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/seller/balance">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Balance & Payouts
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/seller/tabs">
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Store Tabs
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/seller/settings">
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Store Settings
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-3">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{order.description || 'Product Sale'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +{formatCurrency(order.net_amount || order.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No sales yet</p>
                  <p className="text-sm">Add products to start selling!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Items Alert */}
        {productStats && productStats.pending > 0 && (
          <Card className="mt-6 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="flex-1">
                <p className="font-medium">Products Pending Review</p>
                <p className="text-sm text-muted-foreground">
                  You have {productStats.pending} product(s) awaiting moderation approval.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/seller/products">View Products</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}
