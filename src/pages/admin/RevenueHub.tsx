import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { RevenueDashboard } from '@/components/admin/income/RevenueDashboard';

export default function RevenueHub() {
  return (
    <AdminLayout requiredPermissions={['view_income']}>
      <AdminHubProvider>
        <RevenueDashboard />
      </AdminHubProvider>
    </AdminLayout>
  );
}
