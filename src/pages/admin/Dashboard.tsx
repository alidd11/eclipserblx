import { AdminLayout } from '@/components/admin/AdminLayout';
import { HeroBanner } from '@/components/admin/dashboard/HeroBanner';
import { DashboardKPIs } from '@/components/admin/dashboard/DashboardKPIs';
import { SystemAlerts } from '@/components/admin/dashboard/SystemAlerts';
import { DutyClockWidget } from '@/components/admin/dashboard/DutyClockWidget';
import { QuickActionsGrid } from '@/components/admin/dashboard/QuickActionsGrid';
import { AssignedTicketsWidget } from '@/components/admin/dashboard/AssignedTicketsWidget';
import { TodayQueue } from '@/components/admin/dashboard/TodayQueue';
import { RevenueSpark } from '@/components/admin/dashboard/RevenueSpark';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <HeroBanner />
        <DashboardKPIs />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <TodayQueue />
            <RevenueSpark />
          </div>
          <div className="space-y-4">
            <DutyClockWidget />
            <SystemAlerts />
          </div>
        </div>

        <AssignedTicketsWidget />
        <QuickActionsGrid />
      </div>
    </AdminLayout>
  );
}
