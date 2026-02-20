import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';




import { PromotionCarousel } from '@/components/home/PromotionCarousel';

import { MarketplaceSection } from '@/components/home/MarketplaceSection';
import { PWADiscordBanner } from '@/components/landing/PWADiscordBanner';
import { OrganizationSchema, WebsiteSearchSchema } from '@/components/seo/StructuredData';

export default function Landing() {
  return (
    <MainLayout>
      <OrganizationSchema />
      <WebsiteSearchSchema />
      <LandingHero />

      {/* Promotions */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <PromotionCarousel />
      </section>

      {/* Discord */}
      <section className="px-4 sm:px-6 lg:px-8 mt-4 mb-2">
        <PWADiscordBanner />
      </section>

      {/* Section rule */}
      <div className="px-4 sm:px-6 lg:px-8 mt-6 mb-2 flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Marketplace</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <MarketplaceSection />
    </MainLayout>
  );
}
