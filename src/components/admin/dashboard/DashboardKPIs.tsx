import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, MessageCircle, Users, Clock } from 'lucide-react';

interface KPIItem {
  label: string;
  value: number;
  icon: React.ElementType;
}

export function DashboardKPIs() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-kpis'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeOrders, openTickets, staffOnDuty, todayOrders] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
        supabase.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('staff_duty_logs').select('id', { count: 'exact', head: true }).is('clock_out', null),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      ]);

      return {
        activeOrders: activeOrders.count || 0,
        openTickets: openTickets.count || 0,
        staffOnDuty: staffOnDuty.count || 0,
        todayOrders: todayOrders.count || 0,
      };
    },
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const kpis: KPIItem[] = [
    { label: 'Active Orders', value: data?.activeOrders ?? 0, icon: ShoppingCart },
    { label: 'Open Tickets', value: data?.openTickets ?? 0, icon: MessageCircle },
    { label: "Today's Orders", value: data?.todayOrders ?? 0, icon: Users },
    { label: 'Staff On Duty', value: data?.staffOnDuty ?? 0, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
          <p className="text-2xl font-bold">
            {isLoading ? '—' : kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}
