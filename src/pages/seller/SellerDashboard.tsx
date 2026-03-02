import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileReviewConsentBanner } from '@/components/seller/FileReviewConsentBanner';
import { SellerHeroBanner } from '@/components/seller/SellerHeroBanner';
import { StoreSetupChecklist } from '@/components/seller/StoreSetupChecklist';
import { SellerOnboardingWizard } from '@/components/seller/SellerOnboardingWizard';
import { RevenueChart } from '@/components/seller/RevenueChart';
import { RevenueSummaryStats } from '@/components/seller/RevenueSummaryStats';
import { ProductHealthDonut } from '@/components/seller/ProductHealthDonut';
import { RecentOrdersTable } from '@/components/seller/RecentOrdersTable';
import { TosBanner, NonCompliantBanner, PendingReviewBanner } from '@/components/seller/banners';
import { DashboardCardSkeleton, StatRowSkeleton } from '@/components/seller/DashboardSkeletons';
import { motion } from 'framer-motion';
import { 
  Package, ShoppingCart, Plus, BarChart3, Tag, DollarSign, LayoutGrid, Megaphone
} from 'lucide-react';

// Lazy-load below-fold heavy widgets
const TopProductsLeaderboard = lazy(() => import('@/components/seller/TopProductsLeaderboard').then(m => ({ default: m.TopProductsLeaderboard })));
const NotificationCenter = lazy(() => import('@/components/seller/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const StoreHealthScore = lazy(() => import('@/components/seller/StoreHealthScore').then(m => ({ default: m.StoreHealthScore })));
const CustomerDemographics = lazy(() => import('@/components/seller/CustomerDemographics').then(m => ({ default: m.CustomerDemographics })));
const PayoutTimeline = lazy(() => import('@/components/seller/PayoutTimeline').then(m => ({ default: m.PayoutTimeline })));
const StorePreviewCard = lazy(() => import('@/components/seller/StorePreviewCard').then(m => ({ default: m.StorePreviewCard })));

const CURRENT_TOS_VERSION = "1.0";

export default function SellerDashboard() {
  const { store } = useSellerStatus();

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
      const { data, error } = await supabase
        .from('products')
        .select('id, moderation_status, description, asset_file_url')
        .eq('store_id', store.id);
      if (error) throw error;
      const products = data || [];
      const nonCompliant = products.filter(p => {
        const plainDesc = (p.description || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
        return plainDesc.length < 100 || !p.asset_file_url;
      });
      return {
        total: products.length,
        pending: products.filter(p => p.moderation_status === 'pending').length,
        approved: products.filter(p => p.moderation_status === 'approved').length,
        nonCompliant: nonCompliant.length,
      };
    },
    enabled: !!store?.id,
  });

  const quickActions = [
    { title: 'Analytics', href: '/seller/analytics', icon: BarChart3, description: 'View store metrics' },
    { title: 'Products', href: '/seller/products', icon: Package, description: 'Manage listings' },
    { title: 'Orders', href: '/seller/orders', icon: ShoppingCart, description: 'View sales' },
    { title: 'Balance', href: '/seller/balance', icon: DollarSign, description: 'Payouts & earnings' },
    { title: 'Discounts', href: '/seller/discounts', icon: Tag, description: 'Create promos' },
    { title: 'Categories', href: '/seller/tabs', icon: LayoutGrid, description: 'Customize pages' },
    { title: 'Promote', href: '/seller/promote', icon: Megaphone, description: 'Boost products' },
  ];

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* ── Banners ── */}
        <TosBanner isLoading={tosLoading} hasSigned={!!hasSignedTos} />
        <FileReviewConsentBanner />
        <NonCompliantBanner count={productStats?.nonCompliant || 0} />

        {/* ── Onboarding ── */}
        <SellerOnboardingWizard />
        <SellerHeroBanner />
        <StoreSetupChecklist />

        {/* ── Revenue Summary Stats ── */}
        <RevenueSummaryStats />

        {/* ── Quick Actions Grid ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} to={action.href}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-lg bg-muted/50 hover:bg-accent transition-colors text-center group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-card border border-border group-hover:border-primary/30 transition-colors">
                      <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <span className="text-xs font-medium block">{action.title}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{action.description}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Revenue Chart + Product Health ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ProductHealthDonut />
        </div>

        {/* ── Recent Orders Table ── */}
        <RecentOrdersTable />

        {/* ── Top Products + Activity Feed ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <TopProductsLeaderboard />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <NotificationCenter />
          </Suspense>
        </div>

        {/* ── Store Health + Demographics + Payout + Preview ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <StoreHealthScore />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <CustomerDemographics />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <PayoutTimeline />
          </Suspense>
        </div>

        <Suspense fallback={<DashboardCardSkeleton />}>
          <StorePreviewCard />
        </Suspense>

        {/* ── Pending Review Banner ── */}
        <PendingReviewBanner count={productStats?.pending || 0} />
      </div>
    </SellerLayout>
  );
}
