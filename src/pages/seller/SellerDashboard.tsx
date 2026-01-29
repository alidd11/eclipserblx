import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { StoreHealthScore } from '@/components/seller/StoreHealthScore';
import { NotificationCenter } from '@/components/seller/NotificationCenter';
import { toast } from 'sonner';
import { 
  Store, 
  Package, 
  ShoppingCart, 
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
  Tag,
  DollarSign
} from 'lucide-react';

const CURRENT_TOS_VERSION = "1.0";

// Time-based greeting helper
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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

  const quickActions = [
    { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'View store metrics' },
    { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
    { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
    { title: 'Balance', href: '/seller/balance', icon: DollarSign, description: 'Payouts & earnings' },
    { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
    { title: 'Categories', href: '/seller/tabs', icon: LayoutGrid, description: 'Customize pages' },
  ];

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOS Warning Banner */}
        {!tosLoading && !hasSignedTos && (
          <Card className="border-amber-500/50 bg-amber-500/5">
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

        {/* Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Store className="h-7 w-7 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                {getTimeBasedGreeting()}, {store?.name || 'Seller'}!
              </h1>
              {store?.is_verified && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Here's what's happening with your store today.
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
          <Card className="bg-primary/5 border-primary/20 overflow-hidden">
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

        {/* Stats Cards - Using AdminStatCard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminStatCard
            label="Total Revenue"
            value={formatCurrency(store?.total_revenue || 0)}
            valueColor="default"
            subtitle="Lifetime earnings"
          />
          <AdminStatCard
            label="Available Balance"
            value={formatCurrency(balance?.available_balance || 0)}
            valueColor="green"
            subtitle="Ready for payout"
          />
          <AdminStatCard
            label="Total Sales"
            value={store?.total_sales || 0}
            valueColor="blue"
            subtitle="Products sold"
          />
          <AdminStatCard
            label="Products"
            value={statsLoading ? '...' : productStats?.total || 0}
            valueColor="default"
            subtitle={`${productStats?.pending || 0} pending review`}
          />
        </div>

        {/* Quick Actions Grid - Wrapped in Card like Admin */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} to={action.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-center group">
                    <div className="p-2 rounded-lg bg-background group-hover:bg-primary/10 transition-colors">
                      <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium">{action.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews Quick Link for stores with sales */}
        {store?.slug && (store?.total_sales || 0) > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Customer Reviews</p>
                  <p className="text-sm text-muted-foreground">See what customers are saying</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/store/${store.slug}/reviews`}>
                  View Reviews
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Store Health */}
        <StoreHealthScore />

        {/* Activity Feed */}
        <NotificationCenter />

        {/* Pending Items Alert */}
        {productStats && productStats.pending > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
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
