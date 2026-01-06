import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ForumShowcase } from '@/components/home/ForumShowcase';
import { TrustSignals } from '@/components/home/TrustSignals';

export default function Index() {
  return (
    <MainLayout>
      <HeroSection />
      <ForumShowcase />
      <TrustSignals />
    </MainLayout>
  );
}
