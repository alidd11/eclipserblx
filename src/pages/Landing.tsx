import { lazy, Suspense, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { LandingHero } from '@/components/landing/LandingHero';


const PromotionCarousel = lazy(() => import('@/components/home/PromotionCarousel').then(m => ({ default: m.PromotionCarousel })));
const PWADiscordBanner = lazy(() => import('@/components/landing/PWADiscordBanner').then(m => ({ default: m.PWADiscordBanner })));
const ActiveOffersCard = lazy(() => import('@/components/home/ActiveOffersCard').then(m => ({ default: m.ActiveOffersCard })));
const ForYouSection = lazy(() => import('@/components/home/ForYouSection').then(m => ({ default: m.ForYouSection })));
const AbandonedCartBanner = lazy(() => import('@/components/marketplace/AbandonedCartBanner').then(m => ({ default: m.AbandonedCartBanner })));

// New v3.2 landing sections
const TrendingProducts = lazy(() => import('@/components/landing/TrendingProducts').then(m => ({ default: m.TrendingProducts })));
const NewThisWeek = lazy(() => import('@/components/landing/NewThisWeek').then(m => ({ default: m.NewThisWeek })));
const FreeAssetsTeaser = lazy(() => import('@/components/landing/FreeAssetsTeaser').then(m => ({ default: m.FreeAssetsTeaser })));
const TopSellers = lazy(() => import('@/components/landing/TopSellers').then(m => ({ default: m.TopSellers })));
const FeaturedCreators = lazy(() => import('@/components/landing/FeaturedCreators').then(m => ({ default: m.FeaturedCreators })));
const WhyEclipse = lazy(() => import('@/components/landing/WhyEclipse').then(m => ({ default: m.WhyEclipse })));
const TrustBar = lazy(() => import('@/components/landing/TrustBar').then(m => ({ default: m.TrustBar })));
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

      {/* Promotions + Banners */}
      <SectionErrorBoundary section="promotions" compact>
        <ScrollReveal direction="up" distance={20} duration={0.4}>
          <div className="px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 space-y-3">
            <div className="lg:grid lg:grid-cols-2 lg:gap-3 space-y-3 lg:space-y-0">
              <ScrollReveal delay={0.05} direction="up" distance={16} duration={0.35}>
                <Suspense fallback={<div className="h-[72px] rounded-lg border border-border bg-card animate-pulse" />}>
                  <PromotionCarousel />
                </Suspense>
              </ScrollReveal>
              <ScrollReveal delay={0.12} direction="up" distance={16} duration={0.35}>
                <Suspense fallback={<div className="h-[72px] rounded-lg border border-border bg-card animate-pulse" />}>
                  <PWADiscordBanner />
                </Suspense>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.18} direction="up" distance={12} duration={0.3}>
              <Suspense fallback={null}>
                <ActiveOffersCard />
              </Suspense>
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </SectionErrorBoundary>

      <Suspense fallback={null}>
        <div className="px-4 sm:px-6 lg:px-8 mt-3">
          <AbandonedCartBanner />
        </div>
      </Suspense>

      {/* Trending Products */}
      <LazySection minHeight="200px" rootMargin="300px">
        <SectionErrorBoundary section="trending" compact>
          <Suspense fallback={null}>
            <TrendingProducts />
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

      {/* Featured Creators */}
      <LazySection minHeight="150px" rootMargin="200px">
        <SectionErrorBoundary section="featured-creators" compact>
          <Suspense fallback={null}>
            <FeaturedCreators />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Why Eclipse */}
      <LazySection minHeight="200px" rootMargin="200px">
        <SectionErrorBoundary section="why-eclipse" compact>
          <Suspense fallback={null}>
            <WhyEclipse />
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>

      {/* Trust Bar */}
      <LazySection minHeight="60px" rootMargin="200px">
        <SectionErrorBoundary section="trust-bar" compact>
          <Suspense fallback={null}>
            <TrustBar />
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
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <ForYouSection />
            </div>
          </Suspense>
        </SectionErrorBoundary>
      </LazySection>
      </PullToRefresh>
    </MainLayout>
  );
}
