import { forwardRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';
import { MarketplaceSection } from '@/components/home/MarketplaceSection';
import { PWADiscordBanner } from '@/components/landing/PWADiscordBanner';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { OrganizationSchema, WebsiteSearchSchema, SiteNavigationSchema } from '@/components/seo/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { LazySection } from '@/components/ui/LazySection';

const Landing = forwardRef<HTMLDivElement>(function Landing(_props, _ref) {
  usePageMeta({ canonicalPath: '/' });

  return (
    <MainLayout>
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
                <PromotionCarousel />
              </ScrollReveal>
              <ScrollReveal delay={0.12} direction="up" distance={16} duration={0.35}>
                <PWADiscordBanner />
              </ScrollReveal>
            </div>
            <ScrollReveal delay={0.18} direction="up" distance={12} duration={0.3}>
              <ActiveOffersCard />
            </ScrollReveal>
          </div>
        </ScrollReveal>
      </SectionErrorBoundary>

      {/* Marketplace — lazy-loaded since it's below the fold and data-heavy */}
      <LazySection minHeight="600px" rootMargin="300px">
        <ScrollReveal direction="none" duration={0.4}>
          <div className="px-4 sm:px-6 lg:px-8 mt-8 mb-2 flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Marketplace</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </ScrollReveal>

        <SectionErrorBoundary section="marketplace">
          <MarketplaceSection />
        </SectionErrorBoundary>
      </LazySection>
    </MainLayout>
  );
});

export default Landing;
