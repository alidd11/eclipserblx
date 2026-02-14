import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';

import { LandingTrustSignals } from '@/components/landing/LandingTrustSignals';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';
import { ReviewsShowcase } from '@/components/home/ReviewsShowcase';
import { PWALandingHero } from '@/components/landing/PWALandingHero';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { OrganizationSchema, WebsiteSearchSchema } from '@/components/seo/StructuredData';

export default function Landing() {
  const { isStandalone, isLoading } = usePWAStandalone();

  // Show nothing while detecting PWA mode to prevent flash
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh]" />
      </MainLayout>
    );
  }

  // PWA standalone mode: simplified hero-only layout
  if (isStandalone) {
    return (
      <MainLayout>
        <PWALandingHero />
      </MainLayout>
    );
  }

  // Browser mode: full landing page
  return (
    <MainLayout>
      <OrganizationSchema />
      <WebsiteSearchSchema />
      <LandingHero />
      {/* Promotions below hero */}
      <section className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <PromotionCarousel />
      </section>
      <LandingCategories />
      <ReviewsShowcase />
      <LandingTrustSignals />
      <LandingCTA />
    </MainLayout>
  );
}
