import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ForumShowcase } from '@/components/home/ForumShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { TrustSignals } from '@/components/home/TrustSignals';
import { ReviewsShowcase } from '@/components/home/ReviewsShowcase';

export default function Index() {
  return (
    <MainLayout>
      <HeroSection />
      <ReviewsShowcase />
      <ForumShowcase />
      <FeaturedProducts />
      <TrustSignals />
    </MainLayout>
  );
}
