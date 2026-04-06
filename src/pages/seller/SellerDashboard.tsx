import { lazy, Suspense } from 'react';
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
import { SellerCommandCenter } from '@/components/seller/SellerCommandCenter';
import { SellerPromoBanner } from '@/components/seller/SellerPromoBanner';

// Lazy-load below-fold heavy widgets
const TopProductsLeaderboard = lazy(() => import('@/components/seller/TopProductsLeaderboard').then(m => ({ default: m.TopProductsLeaderboard })));
const NotificationCenter = lazy(() => import('@/components/seller/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const StoreHealthScore = lazy(() => import('@/components/seller/StoreHealthScore').then(m => ({ default: m.StoreHealthScore })));

const CURRENT_TOS_VERSION = "1.0";

export default function SellerDashboard() {
  const { store } = useSellerStatus();
  const { inFreePromo, freePromoEndsAt, isGracePeriod, gracePeriodEndsAt, openPortal } = useSellerSubscription();

  useRealtimeOrders();

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

  return (
    <SellerLayout>
      <div className="space-y-4">
        <TosBanner isLoading={tosLoading} hasSigned={!!hasSignedTos} />
        <FileReviewConsentBanner />
        <NonCompliantBanner count={productStats?.nonCompliant || 0} />

        {isGracePeriod && gracePeriodEndsAt && (
          <GracePeriodBanner gracePeriodEndsAt={gracePeriodEndsAt} onUpdatePayment={openPortal} />
        )}

        {inFreePromo && freePromoEndsAt && (
          <SellerPromoBanner freePromoEndsAt={freePromoEndsAt} />
        )}

        <SellerOnboardingWizard />
        <SellerHeroBanner />
        <RevenueSummaryStats />
        <SellerCommandCenter />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ProductHealthDonut />
        </div>

        <RecentOrdersTable />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Suspense fallback={<DashboardCardSkeleton />}>
            <TopProductsLeaderboard />
          </Suspense>
          <Suspense fallback={<DashboardCardSkeleton />}>
            <NotificationCenter />
          </Suspense>
        </div>

        <Suspense fallback={<DashboardCardSkeleton />}>
          <StoreHealthScore />
        </Suspense>

        <PendingReviewBanner count={productStats?.pending || 0} />
      </div>
    </SellerLayout>
  );
}
