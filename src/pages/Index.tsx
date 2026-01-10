import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ForumShowcase } from '@/components/home/ForumShowcase';
import { TrustSignals } from '@/components/home/TrustSignals';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';

export default function Index() {
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  return (
    <MainLayout>
      <HeroSection />
      <ForumShowcase />
      <TrustSignals />
    </MainLayout>
  );
}
