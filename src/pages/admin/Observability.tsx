import { AdminLayout } from '@/components/admin/AdminLayout';
import { ObservabilityDashboard } from '@/components/admin/ObservabilityDashboard';

export default function Observability() {
  return (
    <AdminLayout requiredPermissions={['view_audit_logs']}>
      <ObservabilityDashboard />
    </AdminLayout>
  );
}
