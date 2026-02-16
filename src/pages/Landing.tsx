import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';



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
      {/* Promotions below hero */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
      <PromotionCarousel />
      </section>
      <section className="px-4 sm:px-6 lg:px-8 mt-4 mb-2">
        <PWADiscordBanner />
      </section>
      <MarketplaceSection />
      <LandingCategories />
      
      
      
    </MainLayout>
  );
}
