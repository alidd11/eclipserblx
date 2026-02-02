import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';
import { LandingFeaturedProducts } from '@/components/landing/LandingFeaturedProducts';
import { LandingTrustSignals } from '@/components/landing/LandingTrustSignals';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { PromotionCarousel } from '@/components/home/PromotionCarousel';

export default function Landing() {
  return (
    <MainLayout>
      <LandingHero />
      {/* Active Offers / Promotions */}
      <section className="container mx-auto px-4 -mt-8 relative z-20 space-y-4">
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
