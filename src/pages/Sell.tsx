import { MainLayout } from '@/components/layout/MainLayout';
import { SellerInfoContent } from '@/components/seller/SellerInfoContent';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

export default function Sell() {
  return (
    <MainLayout>
      <ResponsiveContainer size="lg" className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl">
        <SellerInfoContent />
      </ResponsiveContainer>
    </MainLayout>
  );
}
