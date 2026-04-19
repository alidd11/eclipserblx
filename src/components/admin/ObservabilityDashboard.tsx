/**
 * Observability Dashboard — single pane of glass for E2E health.
 * Synthetic-run success rate, latency, open reconciliation findings.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

interface SyntheticHealth {
  probe_name: string; total_runs: number; successful_runs: number;
  success_rate: number; avg_latency_ms: number; p95_latency_ms: number;
  last_run_at: string; last_run_success: boolean;
}
interface FindingSummary { severity: string; count: number }
interface RecentRun { id: string; probe_name: string; success: boolean; total_latency_ms: number; failed_step: string | null; error_message: string | null; created_at: string }
interface OpenFinding { id: string; check_name: string; severity: string; affected_count: number; details: string | null; created_at: string }

export function ObservabilityDashboard() {
  const [running, setRunning] = useState<'probe' | 'reconciliation' | null>(null);

  const health = useQuery({
    queryKey: ['synthetic-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_synthetic_health' as any, { _hours: 24 });
      if (error) throw error;
      return (data ?? []) as SyntheticHealth[];
    },
    refetchInterval: 60_000,
  });

  const findingsSummary = useQuery({
    queryKey: ['findings-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_open_findings_summary' as any);
      if (error) throw error;
      return (data ?? []) as FindingSummary[];
    },
    refetchInterval: 60_000,
  });

  const recentRuns = useQuery({
    queryKey: ['recent-synthetic-runs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('synthetic_runs' as any)
        .select('id, probe_name, success, total_latency_ms, failed_step, error_message, created_at')
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as RecentRun[];
    },
    refetchInterval: 60_000,
  });

  const openFindings = useQuery({
    queryKey: ['open-findings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reconciliation_findings' as any)
        .select('id, check_name, severity, affected_count, details, created_at')
        .eq('resolved', false).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as OpenFinding[];
    },
    refetchInterval: 60_000,
  });

  const triggerProbe = async () => {
    setRunning('probe');
    try {
      const { error } = await supabase.functions.invoke('synthetic-order-probe');
      if (error) throw error;
      toast.success('Synthetic probe completed');
      health.refetch(); recentRuns.refetch();
    } catch (e) { toast.error(`Probe failed: ${(e as Error).message}`); }
    finally { setRunning(null); }
  };

  const triggerReconciliation = async () => {
    setRunning('reconciliation');
    try {
      const { error } = await supabase.functions.invoke('nightly-reconciliation');
      if (error) throw error;
      toast.success('Reconciliation completed');
      findingsSummary.refetch(); openFindings.refetch();
    } catch (e) { toast.error(`Reconciliation failed: ${(e as Error).message}`); }
    finally { setRunning(null); }
  };

  const resolveFinding = async (id: string) => {
    const { error } = await supabase.from('reconciliation_findings' as any)
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Finding resolved');
    findingsSummary.refetch(); openFindings.refetch();
  };

  const totalOpen = (findingsSummary.data ?? []).reduce((sum, f) => sum + Number(f.count), 0);
  const critical = (findingsSummary.data ?? []).find(f => f.severity === 'critical')?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Production Observability</h2>
          <p className="text-sm text-muted-foreground">Synthetic E2E probes + nightly reconciliation. Updated continuously.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={triggerProbe} disabled={!!running}>
            <Activity className="h-4 w-4 mr-2" />{running === 'probe' ? 'Running…' : 'Run probe now'}
          </Button>
          <Button variant="outline" size="sm" onClick={triggerReconciliation} disabled={!!running}>
            <Database className="h-4 w-4 mr-2" />{running === 'reconciliation' ? 'Running…' : 'Run reconciliation'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { health.refetch(); recentRuns.refetch(); findingsSummary.refetch(); openFindings.refetch(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(health.data ?? []).length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="py-8 text-center text-muted-foreground">
              No synthetic runs in the last 24h. Click "Run probe now" to seed data.
            </CardContent>
          </Card>
        )}
        {(health.data ?? []).map(h => (
          <Card key={h.probe_name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{h.probe_name}</CardTitle>
                {h.last_run_success
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <XCircle className="h-5 w-5 text-destructive" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Success rate</span><span className="font-mono font-medium">{h.success_rate}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Runs (24h)</span><span className="font-mono">{h.successful_runs}/{h.total_runs}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avg latency</span><span className="font-mono">{h.avg_latency_ms}ms</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">p95 latency</span><span className="font-mono">{h.p95_latency_ms}ms</span></div>
              <div className="flex justify-between text-xs pt-1"><span className="text-muted-foreground">Last run</span><span>{formatDistanceToNow(new Date(h.last_run_at), { addSuffix: true })}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />Open reconciliation findings
            </CardTitle>
            <div className="flex items-center gap-2">
              {Number(critical) > 0 && <Badge variant="destructive">{String(critical)} critical</Badge>}
              <Badge variant={totalOpen > 0 ? 'secondary' : 'outline'}>{totalOpen} open</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(openFindings.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">✓ No open findings.</p>
          ) : (
            <div className="space-y-2">
              {(openFindings.data ?? []).map(f => (
                <div key={f.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs">{f.check_name}</code>
                      <Badge variant={f.severity === 'critical' ? 'destructive' : f.severity === 'warn' ? 'secondary' : 'outline'} className="text-[10px]">
                        {f.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{f.affected_count} rows</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{f.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => resolveFinding(f.id)}>Resolve</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent synthetic runs</CardTitle></CardHeader>
        <CardContent>
          {(recentRuns.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">When</th><th className="py-2 pr-3">Probe</th>
                    <th className="py-2 pr-3">Result</th><th className="py-2 pr-3">Latency</th><th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentRuns.data ?? []).map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                      <td className="py-2 pr-3"><code className="text-xs">{r.probe_name}</code></td>
                      <td className="py-2 pr-3">
                        {r.success
                          ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">pass</Badge>
                          : <Badge variant="destructive">fail</Badge>}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.total_latency_ms}ms</td>
                      <td className="py-2 text-xs text-muted-foreground truncate max-w-md">
                        {r.success ? '—' : `${r.failed_step}: ${r.error_message}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
