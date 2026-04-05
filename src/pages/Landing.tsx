import { lazy, Suspense, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { LandingHero } from '@/components/landing/LandingHero';


// Eager-load above-the-fold sections (no lazy)
import { TrendingProducts } from '@/components/landing/TrendingProducts';

const ActiveOffersCard = lazy(() => import('@/components/home/ActiveOffersCard').then(m => ({ default: m.ActiveOffersCard })));
const ForYouSection = lazy(() => import('@/components/home/ForYouSection').then(m => ({ default: m.ForYouSection })));
const AbandonedCartBanner = lazy(() => import('@/components/marketplace/AbandonedCartBanner').then(m => ({ default: m.AbandonedCartBanner })));

const RecentReleases = lazy(() => import('@/components/landing/RecentReleases').then(m => ({ default: m.RecentReleases })));
const OnSaleProducts = lazy(() => import('@/components/landing/OnSaleProducts').then(m => ({ default: m.OnSaleProducts })));
const FreeAssetsTeaser = lazy(() => import('@/components/landing/FreeAssetsTeaser').then(m => ({ default: m.FreeAssetsTeaser })));


const FinalCTA = lazy(() => import('@/components/landing/FinalCTA').then(m => ({ default: m.FinalCTA })));
const RecentlyViewedSection = lazy(() => import('@/components/landing/RecentlyViewedSection').then(m => ({ default: m.RecentlyViewedSection })));

import { OrganizationSchema, WebsiteSearchSchema, SiteNavigationSchema } from '@/components/seo/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { LazySection } from '@/components/ui/LazySection';

export default function Landing() {
  usePageMeta({ canonicalPath: '/' });

  const handleRefresh = useCallback(async () => {
    window.location.reload();
  }, []);

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <OrganizationSchema />
      <WebsiteSearchSchema />
      <SiteNavigationSchema />

      {/* Hero — compact */}
      <SectionErrorBoundary section="hero" compact>
        <LandingHero />
      </SectionErrorBoundary>

      {/* Category Quick Nav */}
      <SectionErrorBoundary section="categories" compact>
        <CategoryQuickNav />
      </SectionErrorBoundary>

      {/* Trending Products */}
      <SectionErrorBoundary section="trending" compact>
        <TrendingProducts />
      </SectionErrorBoundary>

      {/* Promotions */}
      <SectionErrorBoundary section="promotions" compact>
        <Suspense fallback={null}>
          <ActiveOffersCard />
        </Suspense>
      </SectionErrorBoundary>

      <Suspense fallback={null}>
        <AbandonedCartBanner />
      </Suspense>

      {/* Recent Releases */}
      <LazySection minHeight="200px" rootMargin="300px">
        <SectionErrorBoundary section="recent-releases" compact>
          <Suspense fallback={null}>
            <RecentReleases />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* On Sale Products */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="on-sale" compact>
          <Suspense fallback={null}>
            <OnSaleProducts />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Free Assets Teaser */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="free-assets" compact>
          <Suspense fallback={null}>
            <FreeAssetsTeaser />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Recently Viewed */}
      <LazySection minHeight="150px" rootMargin="200px">
        <SectionErrorBoundary section="recently-viewed" compact>
          <Suspense fallback={null}>
            <RecentlyViewedSection />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* For You */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="for-you" compact>
          <Suspense fallback={null}>
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <ForYouSection />
            </div>
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Final CTA */}
      <LazySection minHeight="150px" rootMargin="200px">
        <SectionErrorBoundary section="final-cta" compact>
          <Suspense fallback={null}>
            <FinalCTA />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>
      </PullToRefresh>
    </MainLayout>
  );
}
