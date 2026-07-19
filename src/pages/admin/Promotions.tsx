import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DiscountCodesTab } from '@/components/admin/promotions/DiscountCodesTab';

export default function AdminPromotions() {
  return (
    <AdminLayout requiredPermissions={['manage_discounts']}>
      <div className="space-y-4">
        <AdminPageHeader title="Promotions" description="Manage discount codes" />
        <DiscountCodesTab />
      </div>
    </AdminLayout>
  );
}
