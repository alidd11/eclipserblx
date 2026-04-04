import { lazy, Suspense, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { LandingHero } from '@/components/landing/LandingHero';



const PWADiscordBanner = lazy(() => import('@/components/landing/PWADiscordBanner').then(m => ({ default: m.PWADiscordBanner })));
const ActiveOffersCard = lazy(() => import('@/components/home/ActiveOffersCard').then(m => ({ default: m.ActiveOffersCard })));
const ForYouSection = lazy(() => import('@/components/home/ForYouSection').then(m => ({ default: m.ForYouSection })));
const AbandonedCartBanner = lazy(() => import('@/components/marketplace/AbandonedCartBanner').then(m => ({ default: m.AbandonedCartBanner })));

// New v3.2 landing sections
const TrendingProducts = lazy(() => import('@/components/landing/TrendingProducts').then(m => ({ default: m.TrendingProducts })));
const NewThisWeek = lazy(() => import('@/components/landing/NewThisWeek').then(m => ({ default: m.NewThisWeek })));
const RecentReleases = lazy(() => import('@/components/landing/RecentReleases').then(m => ({ default: m.RecentReleases })));
const OnSaleProducts = lazy(() => import('@/components/landing/OnSaleProducts').then(m => ({ default: m.OnSaleProducts })));
const FreeAssetsTeaser = lazy(() => import('@/components/landing/FreeAssetsTeaser').then(m => ({ default: m.FreeAssetsTeaser })));

const TopSellers = lazy(() => import('@/components/landing/TopSellers').then(m => ({ default: m.TopSellers })));
const WhyEclipse = lazy(() => import('@/components/landing/WhyEclipse').then(m => ({ default: m.WhyEclipse })));
const FinalCTA = lazy(() => import('@/components/landing/FinalCTA').then(m => ({ default: m.FinalCTA })));
const RecentlyViewedSection = lazy(() => import('@/components/landing/RecentlyViewedSection').then(m => ({ default: m.RecentlyViewedSection })));

import { OrganizationSchema, WebsiteSearchSchema, SiteNavigationSchema } from '@/components/seo/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
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

      {/* Hero */}
      <SectionErrorBoundary section="hero" compact>
        <LandingHero />
      </SectionErrorBoundary>

      {/* Promotions + Banners — only take space when content renders */}
      <SectionErrorBoundary section="promotions" compact>
        <Suspense fallback={null}>
          <ActiveOffersCard />
        </Suspense>
      </SectionErrorBoundary>

      <Suspense fallback={null}>
        <AbandonedCartBanner />
      </Suspense>

      {/* Top Creators */}
      <LazySection minHeight="150px" rootMargin="200px">
        <SectionErrorBoundary section="top-creators" compact>
          <Suspense fallback={null}>
            <TopSellers />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Trending Products */}
      <LazySection minHeight="200px" rootMargin="300px">
        <SectionErrorBoundary section="trending" compact>
          <Suspense fallback={null}>
            <TrendingProducts />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Recent Releases — horizontal carousel */}
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

      {/* New This Week */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="new-this-week" compact>
          <Suspense fallback={null}>
            <NewThisWeek />
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

      {/* Why Eclipse + Trust Signals (merged) */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="why-eclipse" compact>
          <Suspense fallback={null}>
            <WhyEclipse />
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

      {/* For You */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="for-you" compact>
          <Suspense fallback={null}>
            <div className="px-4 sm:px-6 lg:px-[5%] py-6">
              <ForYouSection />
            </div>
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>
      </PullToRefresh>
    </MainLayout>
  );
}
