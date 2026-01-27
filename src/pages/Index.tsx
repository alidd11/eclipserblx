import { MainLayout } from '@/components/layout/MainLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ForumShowcase } from '@/components/home/ForumShowcase';
import { TrustSignals } from '@/components/home/TrustSignals';
import { RecommendedProducts } from '@/components/recommendations/RecommendedProducts';
import { usePWAAdminRedirect } from '@/hooks/usePWAAdminRedirect';
import { OrganizationSchema, WebsiteSearchSchema } from '@/components/seo/StructuredData';

export default function Index() {
  // Redirect to admin login if this PWA was installed from admin context
  usePWAAdminRedirect();

  return (
    <MainLayout>
      <OrganizationSchema />
      <WebsiteSearchSchema />
      <HeroSection />
      <RecommendedProducts />
      <ForumShowcase />
      <TrustSignals />
    </MainLayout>
  );
}
