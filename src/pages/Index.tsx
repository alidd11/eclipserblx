import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ForumShowcase } from '@/components/home/ForumShowcase';
import { TrustSignals } from '@/components/home/TrustSignals';
import { DiscordWidget } from '@/components/home/DiscordWidget';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';

export default function Index() {
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  return (
    <MainLayout>
      <HeroSection />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto md:mx-0">
          <DiscordWidget />
        </div>
      </div>
      <ForumShowcase />
      <TrustSignals />
    </MainLayout>
  );
}
