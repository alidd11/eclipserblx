import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, Bot, AlertTriangle, Loader2 } from 'lucide-react';

type ChangeRequest = {
  id: string;
  proposing_agent: string;
  board_meeting_id: string | null;
  title: string;
  rationale: string;
  category: string;
  risk_level: string;
  proposal: Record<string, unknown>;
  transcript: unknown;
  status: string;
  decision_notes: string | null;
  reviewed_at: string | null;
  applied_at: string | null;
  apply_error: string | null;
  created_at: string;
};

const RISK_TONE: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  critical: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  applied: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
  withdrawn: 'bg-muted text-muted-foreground border-border',
};

export function OrionChangeRequests() {
  const [rows, setRows] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending_review' | 'all'>('pending_review');

  async function load() {
    setLoading(true);
    let q = supabase.from('orion_change_requests' as never).select('*').order('created_at', { ascending: false }).limit(100);
    if (filter === 'pending_review') q = q.eq('status', 'pending_review');
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(((data ?? []) as ChangeRequest[]));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter]);

  async function decide(id: string, decision: 'approve' | 'reject') {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke('orion-change-decide', {
        body: { change_request_id: id, decision, decision_notes: notes[id] ?? null },
      });
      if (error) throw error;
      const result = data as { status?: string; apply_error?: string };
      if (result?.apply_error) toast.error(`Approved but apply failed: ${result.apply_error}`);
      else toast.success(`Change ${decision === 'approve' ? 'approved' : 'rejected'}${result?.status === 'applied' ? ' & applied' : ''}`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight flex items-center gap-2">
            <Bot className="h-4 w-4 text-foreground/70" /> Orion Proposals
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Change requests from Orion's agents. Nothing applies without your approval.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-muted/40 p-1">
          {(['pending_review','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[13px] px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f === 'pending_review' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading proposals…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
          <Bot className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-[15px] text-muted-foreground">No {filter === 'pending_review' ? 'pending' : ''} proposals from Orion.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge variant="outline" className={STATUS_TONE[r.status] ?? ''}>{r.status.replace('_',' ')}</Badge>
                    <Badge variant="outline" className={RISK_TONE[r.risk_level] ?? ''}>{r.risk_level} risk</Badge>
                    <Badge variant="outline">{r.category.replace('_',' ')}</Badge>
                    <span className="text-[11px] text-muted-foreground">
                      from <span className="font-medium text-foreground/80">{r.proposing_agent}</span>
                      {' · '}{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight">{r.title}</h3>
                </div>
              </div>

              <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">{r.rationale}</p>

              <details className="text-[13px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Proposal payload
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-muted/40 overflow-x-auto text-[11px] leading-relaxed">
{JSON.stringify(r.proposal, null, 2)}
                </pre>
              </details>

              {r.transcript ? (
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Board meeting transcript
                  </summary>
                  <pre className="mt-2 p-3 rounded-lg bg-muted/40 overflow-x-auto text-[11px] leading-relaxed">
{typeof r.transcript === 'string' ? r.transcript : JSON.stringify(r.transcript, null, 2)}
                  </pre>
                </details>
              ) : null}

              {r.status === 'failed' && r.apply_error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-[13px] text-rose-600">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div><div className="font-medium">Auto-apply failed</div><div>{r.apply_error}</div></div>
                </div>
              )}

              {r.status === 'pending_review' ? (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Optional decision notes (sent back to Orion)"
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes(n => ({ ...n, [r.id]: e.target.value }))}
                    rows={2}
                    className="text-[13px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" disabled={busy === r.id}
                      onClick={() => decide(r.id, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={busy === r.id}
                      onClick={() => decide(r.id, 'reject')}>
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                    </Button>
                  </div>
                </div>
              ) : r.decision_notes ? (
                <div className="text-[13px] text-muted-foreground border-l-2 border-border pl-3">
                  <span className="font-medium text-foreground/70">Your note:</span> {r.decision_notes}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrionChangeRequests;
