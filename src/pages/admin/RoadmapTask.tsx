import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertOctagon, Cpu, Hand, Database, FileCode2, ListChecks, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { findTaskByKey, type RoadmapStatus } from '@/lib/roadmap/tasks';
import { useRoadmapStatus, type ResolvedTask } from '@/hooks/useRoadmapStatus';
import { explainProbe } from '@/lib/roadmap/probes';
import { listFilesUnder } from '@/lib/roadmap/probeManifest';
import { formatDistanceToNow } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePageMeta } from '@/hooks/usePageMeta';

const STATUS_META: Record<RoadmapStatus, { label: string; pill: string; icon: typeof CheckCircle2 }> = {
  done:        { label: 'Done',        pill: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',   icon: CheckCircle2 },
  in_progress: { label: 'In Progress', pill: 'bg-amber-500/15 text-amber-600 border-amber-500/30',         icon: Clock },
  todo:        { label: 'Todo',        pill: 'bg-muted/40 text-muted-foreground border-border/40',         icon: Circle },
  blocked:     { label: 'Blocked',     pill: 'bg-rose-500/15 text-rose-600 border-rose-500/30',            icon: AlertOctagon },
};

export default function PlatformRoadmapTask() {
  const { taskKey } = useParams<{ taskKey: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const { byKey, phases } = useRoadmapStatus();

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin', { replace: true });
  }, [authLoading, isAdmin, navigate]);

  const lookup = taskKey ? findTaskByKey(taskKey) : null;
  usePageMeta({ title: lookup ? `${lookup.task.title} · Roadmap` : 'Roadmap', description: lookup?.task.description ?? '' });

  if (!lookup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-muted-foreground">Task not found.</p>
        <Button asChild variant="outline" size="sm"><Link to="/admin/roadmap"><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back to roadmap</Link></Button>
      </div>
    );
  }

  const { task, phase } = lookup;
  const resolved: ResolvedTask | undefined = byKey[task.key];
  const status = resolved?.status ?? task.seed ?? 'todo';
  const source = resolved?.source ?? 'seed';
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  const phaseIdx = phases.findIndex(p => p.key === phase.key);
  const flatTasks = phases.flatMap(p => p.tasks.map(t => ({ ...t, phaseKey: p.key })));
  const idx = flatTasks.findIndex(t => t.key === task.key);
  const prev = idx > 0 ? flatTasks[idx - 1] : null;
  const next = idx >= 0 && idx < flatTasks.length - 1 ? flatTasks[idx + 1] : null;

  const probedFiles = task.probe?.startsWith('fileExists:')
    ? listFilesUnder(task.probe.slice('fileExists:'.length))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/admin/roadmap"><ArrowLeft className="h-4 w-4 mr-1.5" />Roadmap</Link>
          </Button>
          <div className="flex items-center gap-2">
            {prev && <Button asChild variant="ghost" size="sm"><Link to={`/admin/roadmap/${encodeURIComponent(prev.key)}`}>← Prev</Link></Button>}
            {next && <Button asChild variant="ghost" size="sm"><Link to={`/admin/roadmap/${encodeURIComponent(next.key)}`}>Next →</Link></Button>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Phase {phaseIdx + 1}</span>
            <span className="text-muted-foreground/40">/</span>
            <span>{phase.title.replace(/^Phase \d+ — /, '')}</span>
          </div>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{task.title}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{task.description}</p>
            </div>
            <div className={cn('flex items-center gap-2 px-3.5 py-2 rounded-xl border', meta.pill)}>
              <StatusIcon className="h-5 w-5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 leading-none">Status</p>
                <p className="text-sm font-bold leading-tight">{meta.label}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <Badge variant="outline" className="font-mono text-[10px]">{task.key}</Badge>
            <SourceBadge source={source} />
            {resolved?.updatedAt && (
              <span className="text-muted-foreground/70">Verified {formatDistanceToNow(new Date(resolved.updatedAt), { addSuffix: true })}</span>
            )}
          </div>

          {status === 'in_progress' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Completion</p>
                <p className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{task.progress ?? 50}%</p>
              </div>
              <div className="h-2 rounded-full bg-amber-500/15 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${task.progress ?? 50}%` }} />
              </div>
              {task.notes && <p className="text-xs text-foreground/70 mt-2.5 leading-relaxed">{task.notes}</p>}
            </div>
          )}
        </div>

        <Section icon={Info} title="How it's verified">
          <p className="text-sm text-foreground/80 leading-relaxed">{explainProbe(task.probe)}</p>
          {!task.probe && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              ⚠️ No probe attached — this task is tracked via its seeded status.
            </p>
          )}
          {probedFiles.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                Probe sees {probedFiles.length} file{probedFiles.length === 1 ? '' : 's'} matching this prefix
              </summary>
              <ul className="mt-2 space-y-1 text-[11px] font-mono text-muted-foreground bg-muted/30 rounded-lg p-3 max-h-48 overflow-auto">
                {probedFiles.map(f => <li key={f}>{f}</li>)}
              </ul>
            </details>
          )}
        </Section>

        {task.acceptance && task.acceptance.length > 0 && (
          <Section icon={ListChecks} title="Acceptance criteria">
            <ul className="space-y-2">
              {task.acceptance.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={cn('h-4 w-4 shrink-0 mt-0.5', status === 'done' ? 'text-emerald-500' : 'text-muted-foreground/40')} />
                  <span className="text-foreground/85">{line}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {task.evidence && task.evidence.length > 0 && (
          <Section icon={FileCode2} title="Code evidence">
            <ul className="space-y-1.5">
              {task.evidence.map(p => (
                <li key={p}>
                  <code className="text-xs font-mono text-foreground/80 bg-muted/30 rounded px-2 py-1 inline-flex items-center gap-1.5">{p}</code>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {resolved?.note && (
          <Section icon={Hand} title="System note">
            <p className="text-sm text-foreground/85 italic leading-relaxed bg-muted/15 rounded-lg p-3 border border-border/40">{resolved.note}</p>
          </Section>
        )}
      </main>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card/50 p-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  );
}

function SourceBadge({ source }: { source: ResolvedTask['source'] }) {
  const map = {
    manual:        { Icon: Hand,     label: 'system override' },
    probe:         { Icon: Cpu,      label: 'auto · file probe' },
    'probe-async': { Icon: Database, label: 'auto · db probe' },
    seed:          { Icon: Sparkles, label: 'seeded' },
  } as const;
  const { Icon, label } = map[source];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/30 border border-border/40 px-1.5 py-0.5 rounded">
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}
