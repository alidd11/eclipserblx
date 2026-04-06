import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { FileReviewConsentBanner } from '@/components/seller/FileReviewConsentBanner';
import { SellerHeroBanner } from '@/components/seller/SellerHeroBanner';
import { SellerOnboardingWizard } from '@/components/seller/SellerOnboardingWizard';
import { GracePeriodBanner } from '@/components/seller/GracePeriodBanner';
import { RevenueChart } from '@/components/seller/RevenueChart';
import { RevenueSummaryStats } from '@/components/seller/RevenueSummaryStats';
import { ProductHealthDonut } from '@/components/seller/ProductHealthDonut';
import { RecentOrdersTable } from '@/components/seller/RecentOrdersTable';
import { TosBanner, NonCompliantBanner, PendingReviewBanner } from '@/components/seller/banners';
import { DashboardCardSkeleton } from '@/components/seller/DashboardSkeletons';
import { Gift, Clock, Sparkles } from 'lucide-react';
import { 
  Package, ShoppingCart, BarChart3, Tag, DollarSign, Megaphone
} from 'lucide-react';


// Lazy-load below-fold heavy widgets
const TopProductsLeaderboard = lazy(() => import('@/components/seller/TopProductsLeaderboard').then(m => ({ default: m.TopProductsLeaderboard })));
const NotificationCenter = lazy(() => import('@/components/seller/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const StoreHealthScore = lazy(() => import('@/components/seller/StoreHealthScore').then(m => ({ default: m.StoreHealthScore })));

const CURRENT_TOS_VERSION = "1.0";

export default function SellerDashboard() {
  const { store } = useSellerStatus();
  const { inFreePromo, freePromoEndsAt, isGracePeriod, gracePeriodEndsAt, openPortal } = useSellerSubscription();

  // Real-time order notifications
  useRealtimeOrders();

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
  const { data: productStats } = useQuery({
    queryKey: ['seller-product-stats', store?.id],
    queryFn: async () => {
      if (!store?.id) return { total: 0, pending: 0, approved: 0, nonCompliant: 0 };

      const { data: products, error } = await supabase
        .from('products')
        .select('id, moderation_status, description, asset_file_url')
        .eq('store_id', store.id);
      if (error) throw error;
      if (!products?.length) return { total: 0, pending: 0, approved: 0, nonCompliant: 0 };

      const productIds = products.map(p => p.id);
      const { data: botProducts } = await supabase
        .from('bot_products')
        .select('product_id')
        .in('product_id', productIds);
      const botProductIds = new Set((botProducts || []).map(bp => bp.product_id));

      let pending = 0, approved = 0, nonCompliant = 0;
      for (const p of products) {
        if (p.moderation_status === 'pending') pending++;
        if (p.moderation_status === 'approved') approved++;
        const plainDesc = (p.description || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        const needsFile = !botProductIds.has(p.id);
        if (plainDesc.length < 100 || (needsFile && !p.asset_file_url)) nonCompliant++;
      }
      return { total: products.length, pending, approved, nonCompliant };
    },
    enabled: !!store?.id,
    staleTime: 5 * 60 * 1000,
  });

  const createActions = [
    { title: 'Store Builder', href: '/seller/store-builder', icon: Sparkles, description: 'Customize look' },
  ];

  const manageActions = [
    { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
    { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
    { title: 'Balance', href: '/seller/finance', icon: DollarSign, description: 'Earnings & payouts' },
  ];

  const growActions = [
    { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'Store metrics' },
    { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
    { title: 'Campaigns', href: '/seller/promote', icon: Megaphone, description: 'Run ads' },
  ];

  const renderActionGroup = (label: string, actions: typeof createActions) => (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {actions.map((action) => (
          <Link key={action.href} to={action.href}>
            <div className={`flex flex-col items-center gap-1 p-2.5 rounded-lg transition-all text-center group cursor-pointer active:scale-[0.97] ${
              'primary' in action && action.primary
                ? 'bg-primary/10 border border-primary/20 hover:bg-primary/15'
                : 'bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-border/40'
            }`}>
              <div className={`p-1.5 rounded-md transition-colors ${
                'primary' in action && action.primary
                  ? 'bg-primary/15'
                  : 'bg-card border border-border/40'
              }`}>
                <action.icon className={`h-3.5 w-3.5 transition-colors ${
                  'primary' in action && action.primary
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-primary'
                }`} />
              </div>
              <span className="text-[11px] font-medium leading-tight">{action.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <SellerLayout>
      <div className="space-y-4">
        {/* ── Banners ── */}
        <TosBanner isLoading={tosLoading} hasSigned={!!hasSignedTos} />
        <FileReviewConsentBanner />
        <NonCompliantBanner count={productStats?.nonCompliant || 0} />

        {/* ── Free Commission Promo Banner ── */}
        {inFreePromo && freePromoEndsAt && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
              <Gift className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-400">🎉 0% Commission — First 30 Days Free!</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Ends {new Date(freePromoEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} — keep 100% of every sale
              </p>
            </div>
          </div>
        )}

        {/* ── Onboarding ── */}
        <SellerOnboardingWizard />
        <SellerHeroBanner />

        {/* ── Revenue Summary Stats ── */}
        <RevenueSummaryStats />

        {/* ── Command Center ── */}
        <div className="rounded-xl border border-border/50 bg-card p-3">
          <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Command Center</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderActionGroup('Create', createActions)}
            {renderActionGroup('Manage', manageActions)}
            {renderActionGroup('Grow', growActions)}
          </div>
        </div>

        {/* ── Revenue Chart + Product Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ProductHealthDonut />
        </div>

        {/* ── Recent Orders Table ── */}
        <RecentOrdersTable />

        {/* ── Top Products + Notifications ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <TopProductsLeaderboard />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <NotificationCenter />
          </Suspense>
        </div>

        {/* ── Store Health ── */}
        <Suspense fallback={<DashboardCardSkeleton />}>
          <StoreHealthScore />
        </Suspense>

        {/* ── Pending Review Banner ── */}
        <PendingReviewBanner count={productStats?.pending || 0} />
      </div>
    </SellerLayout>
  );
}
