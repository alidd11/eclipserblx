import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreHealthScore } from '@/components/seller/StoreHealthScore';
import { NotificationCenter } from '@/components/seller/NotificationCenter';
import { toast } from 'sonner';
import { 
  Store, 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  Copy,
  ExternalLink,
  LayoutGrid,
  Scale,
  AlertTriangle,
  Star,
  BarChart3,
  Tag
} from 'lucide-react';

const CURRENT_TOS_VERSION = "1.0";

export default function SellerDashboard() {
  const { store, balance } = useSellerStatus();

  // Check if TOS is signed
  const { data: hasSignedTos, isLoading: tosLoading } = useQuery({
    queryKey: ['seller-tos-signed', store?.id, CURRENT_TOS_VERSION],
    queryFn: async () => {
      if (!store?.id) return false;
      
      const { data, error } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!store?.id,
  });

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
        {/* TOS Warning Banner */}
        {!tosLoading && !hasSignedTos && (
          <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    Store Inactive - Agreement Required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your store is not visible to customers until you sign the Seller Terms of Service.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/seller/documents/terms">
                  <Scale className="h-4 w-4 mr-2" />
                  Sign Agreement
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

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

        {/* Quick Actions Grid - 3x3 on mobile, above stats */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {[
            { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'View store metrics' },
            { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
            { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
            { title: 'Balance', href: '/seller/balance', icon: DollarSign, description: 'Payouts & earnings' },
            { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
            { title: 'Store Tabs', href: '/seller/tabs', icon: LayoutGrid, description: 'Customize pages' },
          ].map((link) => (
            <Link key={link.href} to={link.href}>
              <Card className="h-full hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer group">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:gap-2">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <link.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-xs sm:text-sm">{link.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden lg:block">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg sm:text-2xl font-bold">
                  {store?.total_sales || 0}
                </div>
                {store?.slug && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-7 px-2 text-xs"
                  >
                    <Link to={`/store/${store.slug}/reviews`}>
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Reviews
                    </Link>
                  </Button>
                )}
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

        {/* Store Health - Below finance stats */}
        <div className="mb-6">
          <StoreHealthScore />
        </div>

        {/* Activity Feed */}
        <NotificationCenter />

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
