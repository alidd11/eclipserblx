import { AdminLayout } from '@/components/admin/AdminLayout';
import { SystemAlerts } from '@/components/admin/dashboard/SystemAlerts';
import { HeroBanner } from '@/components/admin/dashboard/HeroBanner';
import { DutyClockWidget } from '@/components/admin/dashboard/DutyClockWidget';
import { QuickActionsGrid } from '@/components/admin/dashboard/QuickActionsGrid';
import { AssignedTicketsWidget } from '@/components/admin/dashboard/AssignedTicketsWidget';
import { DashboardKPIs } from '@/components/admin/dashboard/DashboardKPIs';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <HeroBanner />
        <DashboardKPIs />
        <SystemAlerts />
        <DutyClockWidget />
        <QuickActionsGrid />
        <AssignedTicketsWidget />
      </div>
    </AdminLayout>
  );
}
