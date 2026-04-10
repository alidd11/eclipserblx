import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield } from 'lucide-react';
import { format, subHours, subDays } from '@/lib/dateUtils';

export default function RateLimitDashboard() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');

  const cutoff = timeRange === '24h'
    ? subHours(new Date(), 24).toISOString()
    : subDays(new Date(), 7).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['rate-limit-stats', timeRange],
    queryFn: async () => {
      const { data: raw, error } = await supabase
        .from('rate_limits')
        .select('identifier, action_type, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const totalHits = raw?.length ?? 0;

      // Top identifiers
      const idCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      raw?.forEach((r) => {
        idCounts[r.identifier] = (idCounts[r.identifier] || 0) + 1;
        actionCounts[r.action_type] = (actionCounts[r.action_type] || 0) + 1;
      });

      const topIdentifiers = Object.entries(idCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([identifier, count]) => ({ identifier, count }));

      const topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([action, count]) => ({ action, count }));

      const uniqueIdentifiers = Object.keys(idCounts).length;

      return { totalHits, uniqueIdentifiers, topIdentifiers, topActions };
    },
    refetchInterval: 30_000,
  });

  return (
    <AdminLayout requiredPermissions={['view_audit_logs']}>
      <div className="space-y-6">
        <AdminPageHeader
          title="Rate Limits"
          description="Monitor rate-limited requests across the platform"
          actions={
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '24h' | '7d')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AdminStatCard label="Total Hits" value={data?.totalHits ?? 0} />
              <AdminStatCard label="Unique Sources" value={data?.uniqueIdentifiers ?? 0} />
              <AdminStatCard label="Action Types" value={data?.topActions.length ?? 0} />
            </div>

            {/* By Action Type */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">By Action Type</h2>
              <div className="flex flex-wrap gap-2">
                {data?.topActions.map(({ action, count }) => (
                  <Badge key={action} variant="outline" className="gap-1.5">
                    <Shield className="h-3 w-3" />
                    {action}
                    <span className="font-bold">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Top Offenders Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top Sources</h2>
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identifier</TableHead>
                      <TableHead className="text-right">Hits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.topIdentifiers.map(({ identifier, count }) => (
                      <TableRow key={identifier}>
                        <TableCell className="font-mono text-xs">{identifier}</TableCell>
                        <TableCell className="text-right font-bold">{count}</TableCell>
                      </TableRow>
                    ))}
                    {!data?.topIdentifiers.length && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No rate limit hits in this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
