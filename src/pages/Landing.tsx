import { forwardRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';
import { MarketplaceSection } from '@/components/home/MarketplaceSection';
import { PWADiscordBanner } from '@/components/landing/PWADiscordBanner';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { OrganizationSchema, WebsiteSearchSchema } from '@/components/seo/StructuredData';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';

const Landing = forwardRef<HTMLDivElement>(function Landing(_props, _ref) {
  usePageMeta({ canonicalPath: '/' });

  return (
    <MainLayout>
      <OrganizationSchema />
      <WebsiteSearchSchema />

      <SectionErrorBoundary section="hero" compact>
        <LandingHero />
      </SectionErrorBoundary>

      {/* Promotions + Discord — side by side on desktop for density */}
      <SectionErrorBoundary section="promotions" compact>
        <div className="px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 space-y-3">
          <div className="lg:grid lg:grid-cols-2 lg:gap-3 space-y-3 lg:space-y-0">
            <PromotionCarousel />
            <PWADiscordBanner />
          </div>
          <ActiveOffersCard />
        </div>
      </SectionErrorBoundary>

      {/* Section rule */}
      <div className="px-4 sm:px-6 lg:px-8 mt-8 mb-2 flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Marketplace</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <SectionErrorBoundary section="marketplace">
        <MarketplaceSection />
      </SectionErrorBoundary>
    </MainLayout>
  );
});

export default Landing;
