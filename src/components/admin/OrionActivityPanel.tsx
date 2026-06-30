/**
 * OrionActivityPanel — read-only window into the Orion ⇄ RoleplayHub loop.
 *
 * Surfaces the tables driving the integration:
 *   • orion_inbound_commands  — what Orion has sent us
 *   • orion_event_outbox      — what we've queued for Orion
 *   • orion_findings          — issues Orion has flagged
 *
 * The "Send test ping" button drops an `ops.ping` event into the outbox and
 * triggers `orion-dispatch` so admins can verify the round trip end-to-end.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity, ArrowDownLeft, ArrowUpRight, AlertCircle,
  Loader2, RefreshCw, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type InboundRow = {
  id: string;
  command_type: string;
  payload: Record<string, unknown> | null;
  signature_valid: boolean | null;
  status: string;
  error: string | null;
  received_at: string;
  executed_at: string | null;
};

type OutboxRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  last_error: string | null;
  delivered_at: string | null;
  dead_lettered_at: string | null;
  next_attempt_at: string | null;
  created_at: string;
};

type FindingRow = {
  id: string;
  title: string;
  kind: string | null;
  status: string | null;
  raised_by: string | null;
  root_cause: string | null;
  created_at: string;
};

const KIND_TONE: Record<string, string> = {
  bug: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  risk: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  improvement: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  note: 'bg-muted text-muted-foreground border-border',
};

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'delivered' || status === 'executed' || status === 'ok'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      : status === 'failed' || status === 'dead_lettered' || status === 'rejected'
        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
        : 'bg-blue-500/10 text-blue-600 border-blue-500/30';
  return (
    <Badge variant="outline" className={tone}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export function OrionActivityPanel() {
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [inb, out, fin] = await Promise.all([
      supabase
        .from('orion_inbound_commands' as never)
        .select('id, command_type, payload, signature_valid, status, error, received_at, executed_at')
        .order('received_at', { ascending: false })
        .limit(50),
      supabase
        .from('orion_event_outbox' as never)
        .select('id, event_type, payload, attempts, last_error, delivered_at, dead_lettered_at, next_attempt_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('orion_findings' as never)
        .select('id, title, kind, status, raised_by, root_cause, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (inb.error) toast.error(`Inbound: ${inb.error.message}`);
    if (out.error) toast.error(`Outbox: ${out.error.message}`);
    if (fin.error) toast.error(`Findings: ${fin.error.message}`);
    setInbound((inb.data ?? []) as InboundRow[]);
    setOutbox((out.data ?? []) as OutboxRow[]);
    setFindings((fin.data ?? []) as FindingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function sendPing() {
    setPinging(true);
    try {
      const { error: rpcErr } = await supabase.rpc('orion_admin_send_ping' as never);
      if (rpcErr) throw rpcErr;
      const { error: dispErr } = await supabase.functions.invoke('orion-dispatch', { body: {} });
      if (dispErr) throw dispErr;
      toast.success('Ping queued and dispatcher triggered');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPinging(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-foreground/70" /> Orion Activity
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Live view of the Orion ⇄ RoleplayHub loop — what's arriving, what's queued, and what's flagged.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={sendPing} disabled={pinging}>
            {pinging ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Send test ping
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <h3 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-foreground/70" />
            Inbound from Orion
            <span className="text-[11px] font-normal text-muted-foreground">({inbound.length})</span>
          </h3>
          {inbound.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">No commands received yet.</p>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {inbound.map((r) => (
                <li key={r.id} className="rounded-lg border border-border/40 bg-background/40 p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium truncate">{r.command_type}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{r.signature_valid === false ? 'unsigned' : 'orion'}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(r.received_at), { addSuffix: true })}</span>
                  </div>
                  {r.error && (
                    <div className="mt-1 text-[11px] text-rose-600 flex items-start gap-1.5">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {r.error}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <h3 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-foreground/70" />
            Outbound to Orion
            <span className="text-[11px] font-normal text-muted-foreground">({outbox.length})</span>
          </h3>
          {outbox.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">No events queued.</p>
          ) : (
            <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {outbox.map((r) => {
                const status = r.dead_lettered_at
                  ? 'dead_lettered'
                  : r.delivered_at
                    ? 'delivered'
                    : r.attempts > 0
                      ? 'retrying'
                      : 'pending';
                return (
                  <li key={r.id} className="rounded-lg border border-border/40 bg-background/40 p-3 text-[13px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium truncate">{r.event_type}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>attempts: {r.attempts}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    {r.last_error && (
                      <div className="mt-1 text-[11px] text-rose-600 flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{r.last_error}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
        <h3 className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-foreground/70" />
          Findings from Orion
          <span className="text-[11px] font-normal text-muted-foreground">({findings.length})</span>
        </h3>
        {findings.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-6 text-center">No findings logged.</p>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {findings.map((f) => (
              <li key={f.id} className="rounded-lg border border-border/40 bg-background/40 p-3 text-[13px]">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {f.kind && (
                    <Badge variant="outline" className={cn(KIND_TONE[f.kind] ?? '')}>
                      {f.kind}
                    </Badge>
                  )}
                  {f.status && <Badge variant="outline">{f.status}</Badge>}
                  <span className="text-[11px] text-muted-foreground">
                    {f.raised_by ?? 'orion'} · {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="font-medium">{f.title}</p>
                {f.root_cause && <p className="text-[11px] text-muted-foreground mt-1">{f.root_cause}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default OrionActivityPanel;
