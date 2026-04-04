import { MainLayout } from '@/components/layout/MainLayout';
import { SellerInfoContent } from '@/components/seller/SellerInfoContent';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function Sell() {
  usePageMeta({ title: 'Start Selling', description: 'Open your store on Eclipse marketplace. Lower fees, instant payouts, and a growing community of Roblox creators.', canonicalPath: '/sell' });
  return (
    <MainLayout>
      <ResponsiveContainer size="lg" className="py-8 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <SellerInfoContent />
      </ResponsiveContainer>
    </MainLayout>
  );
}
