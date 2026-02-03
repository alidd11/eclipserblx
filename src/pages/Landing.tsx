import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';
import { LandingFeaturedProducts } from '@/components/landing/LandingFeaturedProducts';
import { LandingTrustSignals } from '@/components/landing/LandingTrustSignals';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';
import { PWALandingHero } from '@/components/landing/PWALandingHero';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';

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
      <LandingHero />
      {/* Active Offers / Promotions */}
      <section className="container mx-auto -mt-8 relative z-20 space-y-4">
        <ActiveOffersCard />
        <PromotionCarousel />
      </section>
      <LandingCategories />
      <LandingFeaturedProducts />
      <LandingTrustSignals />
      <LandingCTA />
    </MainLayout>
  );
}
