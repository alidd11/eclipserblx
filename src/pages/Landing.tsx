import { forwardRef, lazy, Suspense, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { LandingHero } from '@/components/landing/LandingHero';
import { MarketplaceSection } from '@/components/home/MarketplaceSection';

// Lazy-load below-fold components to reduce initial JS bundle
const PromotionCarousel = lazy(() => import('@/components/home/PromotionCarousel').then(m => ({ default: m.PromotionCarousel })));
const PWADiscordBanner = lazy(() => import('@/components/landing/PWADiscordBanner').then(m => ({ default: m.PWADiscordBanner })));
const ActiveOffersCard = lazy(() => import('@/components/home/ActiveOffersCard').then(m => ({ default: m.ActiveOffersCard })));
import { OrganizationSchema, WebsiteSearchSchema, SiteNavigationSchema } from '@/components/seo/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LazySection } from '@/components/ui/LazySection';

const Landing = forwardRef<HTMLDivElement>(function Landing(_props, _ref) {
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

      <SectionErrorBoundary section="hero" compact>
        <LandingHero />
      </SectionErrorBoundary>

      {/* Promotions + Discord — side by side on desktop for density */}
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

      {/* Marketplace — lazy-loaded since it's below the fold and data-heavy */}
      <LazySection minHeight="600px" rootMargin="300px">
        <SectionErrorBoundary section="marketplace">
          <MarketplaceSection />
        </SectionErrorBoundary>
      </LazySection>
      </PullToRefresh>
    </MainLayout>
  );
});

export default Landing;
