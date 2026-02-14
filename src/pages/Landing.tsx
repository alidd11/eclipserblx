import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';

import { LandingTrustSignals } from '@/components/landing/LandingTrustSignals';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';
import { ReviewsShowcase } from '@/components/home/ReviewsShowcase';
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
      <MarketplaceSection />
      <section className="px-4 sm:px-6 lg:px-8 -mt-2 mb-4">
        <PWADiscordBanner />
      </section>
      <LandingCategories />
      <ReviewsShowcase />
      <LandingTrustSignals />
      <LandingCTA />
    </MainLayout>
  );
}
