import { AdminLayout } from '@/components/admin/AdminLayout';
import { SystemAlerts } from '@/components/admin/dashboard/SystemAlerts';
import { HeroBanner } from '@/components/admin/dashboard/HeroBanner';
import { DutyClockWidget } from '@/components/admin/dashboard/DutyClockWidget';
import { QuickActionsGrid } from '@/components/admin/dashboard/QuickActionsGrid';
import { RoleToolsGrid } from '@/components/admin/dashboard/RoleToolsGrid';
import { AssignedTicketsWidget } from '@/components/admin/dashboard/AssignedTicketsWidget';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-5">
        <SystemAlerts />
        <HeroBanner />
        <DutyClockWidget />
        <QuickActionsGrid />
        <RoleToolsGrid />
        <AssignedTicketsWidget />
      </div>
    </AdminLayout>
  );
}
