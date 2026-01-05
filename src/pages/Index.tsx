import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { TrustSignals } from '@/components/home/TrustSignals';

export default function Index() {
  return (
    <MainLayout>
      <HeroSection />
      <CategoryShowcase />
      <FeaturedProducts />
      <TrustSignals />
    </MainLayout>
  );
}
