import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminOverviewSnapshot {
  active_orders: number;
  open_tickets: number;
  today_orders: number;
  staff_on_duty: number;
  revenue_today: number;
  revenue_yesterday: number;
  pending_refunds: number;
  products_awaiting_review: number;
  open_incidents: number;
  refund_rate_7d: number;
  revenue_14d: Array<{ day: string; revenue: number }>;
  generated_at: string;
}

/**
 * Single-round-trip snapshot for the admin dashboard.
 * Replaces 6–8 independent count queries with one SECURITY DEFINER RPC.
 */
export function useAdminOverview() {
  return useQuery<AdminOverviewSnapshot>({
    queryKey: ['admin-overview-snapshot'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview_snapshot' as never);
      if (error) throw error;
      return data as unknown as AdminOverviewSnapshot;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
