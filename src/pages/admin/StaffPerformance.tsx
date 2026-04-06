import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { usePageMeta } from '@/hooks/usePageMeta';

interface StaffPerf {
  user_id: string;
  display_name: string | null;
  staff_id: string | null;
  tickets_resolved: number;
  tickets_claimed: number;
  chats_completed: number;
  chats_claimed: number;
  total_actions: number;
  duty_hours_30d: number;
  last_active_at: string;
  avg_csat: number;
  avg_first_response_minutes: number;
  avg_resolution_minutes: number;
}

export default function AdminStaffPerformance() {
  usePageMeta({ title: 'Staff Performance', description: 'Staff performance metrics and activity summary.' });

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_performance_summary' as any)
        .select('*')
        .order('total_actions', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StaffPerf[];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">30-day activity summary across all staff members</p>
        </div>

        {/* Summary cards */}
        {!isLoading && staff && staff.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Tickets Resolved</p>
              <p className="text-2xl font-bold text-foreground mt-1">{staff.reduce((s, m) => s + m.tickets_resolved, 0)}</p>
            </div>
            <div className="border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Chats Completed</p>
              <p className="text-2xl font-bold text-foreground mt-1">{staff.reduce((s, m) => s + m.chats_completed, 0)}</p>
            </div>
            <div className="border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total Duty Hours</p>
              <p className="text-2xl font-bold text-foreground mt-1">{staff.reduce((s, m) => s + m.duty_hours_30d, 0).toFixed(1)}h</p>
            </div>
            <div className="border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Active Staff</p>
              <p className="text-2xl font-bold text-foreground mt-1">{staff.length}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Staff Member</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Tickets</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Chats</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Duty Hours</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Total Actions</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-12 mx-auto" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : !staff?.length ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No staff activity in the last 30 days.
                    </td>
                  </tr>
                ) : (
                  staff.map((m) => (
                    <tr key={m.user_id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-foreground">{m.display_name || 'Unknown'}</p>
                          {m.staff_id && <p className="text-xs text-muted-foreground">{m.staff_id}</p>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="tabular-nums">{m.tickets_resolved}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="tabular-nums">{m.chats_completed}</Badge>
                      </td>
                      <td className="p-3 text-center tabular-nums text-foreground">
                        {m.duty_hours_30d.toFixed(1)}h
                      </td>
                      <td className="p-3 text-center tabular-nums text-foreground">
                        {m.total_actions}
                      </td>
                      <td className="p-3 text-right text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(m.last_active_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
