import { MainLayout } from '@/components/layout/MainLayout';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingCategories } from '@/components/landing/LandingCategories';
import { LandingFeaturedProducts } from '@/components/landing/LandingFeaturedProducts';
import { LandingTrustSignals } from '@/components/landing/LandingTrustSignals';
import { LandingCTA } from '@/components/landing/LandingCTA';

export default function Landing() {
  return (
    <MainLayout>
      <LandingHero />
      <LandingCategories />
      <LandingFeaturedProducts />
      <LandingTrustSignals />
      <LandingCTA />
    </MainLayout>
  );
}
