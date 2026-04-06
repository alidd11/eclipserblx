import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export function MaintenanceBanner() {
  const { data: maintenance } = useQuery({
    queryKey: ['upcoming-maintenance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('incidents')
        .select('id, title, maintenance_start, maintenance_end')
        .eq('is_maintenance', true)
        .gte('maintenance_end', new Date().toISOString())
        .order('maintenance_start', { ascending: true })
        .limit(1);
      return data?.[0] ?? null;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  if (!maintenance) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Scheduled maintenance: <strong>{maintenance.title}</strong>
        {maintenance.maintenance_start && (
          <> — {format(new Date(maintenance.maintenance_start), 'MMM d, h:mm a')}</>
        )}
        {maintenance.maintenance_end && (
          <> to {format(new Date(maintenance.maintenance_end), 'h:mm a')}</>
        )}
      </span>
    </div>
  );
}
