import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, AlertOctagon, Sparkles, ChevronRight, Cpu, Hand, Loader2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useRoadmapStatus, type ResolvedTask } from '@/hooks/useRoadmapStatus';
import type { RoadmapStatus } from '@/lib/roadmap/tasks';
import { formatDistanceToNow } from 'date-fns';

type FilterKey = 'all' | RoadmapStatus;

const STATUS_META: Record<RoadmapStatus, { label: string; pill: string; icon: typeof CheckCircle2 }> = {
  done:        { label: 'Done',        pill: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',   icon: CheckCircle2 },
  in_progress: { label: 'In Progress', pill: 'bg-amber-500/15 text-amber-600 border-amber-500/30',         icon: Clock },
  todo:        { label: 'Todo',        pill: 'bg-muted/40 text-muted-foreground border-border/40',         icon: Circle },
  blocked:     { label: 'Blocked',     pill: 'bg-rose-500/15 text-rose-600 border-rose-500/30',            icon: AlertOctagon },
};

export function PlatformRoadmap() {
  const { loading, phases, totals } = useRoadmapStatus();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activePhase, setActivePhase] = useState<string>('all');

  const visiblePhases = useMemo(() => {
    return phases
      .filter(p => activePhase === 'all' || p.key === activePhase)
      .map(p => ({ ...p, resolvedTasks: p.resolvedTasks.filter(t => filter === 'all' || t.status === filter) }))
      .filter(p => p.resolvedTasks.length > 0);
  }, [phases, filter, activePhase]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Roadmap</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-verified from the codebase, configuration, and live database. No manual edits — ship the work, the roadmap updates itself.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">{totals.done}<span className="text-muted-foreground/50">/{totals.total}</span></p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{totals.weightedPct}% weighted</p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700" style={{ width: `${totals.weightedPct}%` }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['done','in_progress','todo','blocked'] as RoadmapStatus[]).map(s => {
            const Icon = STATUS_META[s].icon;
            const value = s === 'done' ? totals.done : s === 'in_progress' ? totals.inProgress : s === 'todo' ? totals.todo : totals.blocked;
            return (
              <button key={s} onClick={() => setFilter(prev => prev === s ? 'all' : s)} className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all',
                filter === s ? STATUS_META[s].pill : 'border-border/40 bg-muted/15 hover:bg-muted/30'
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 leading-none">{STATUS_META[s].label}</p>
                  <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <aside className="rounded-2xl border border-border/40 bg-card/50 p-3 space-y-1 h-fit lg:sticky lg:top-20">
          <button onClick={() => setActivePhase('all')} className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all',
              activePhase === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40 text-foreground/70')}>
            <span>All phases</span>
            <span className="text-xs tabular-nums opacity-60">{totals.done}/{totals.total}</span>
          </button>
          <div className="h-px bg-border/30 my-1.5" />
          {phases.map((p, idx) => {
            const fullyDone = p.doneCount === p.totalCount;
            const active = activePhase === p.key;
            return (
              <button key={p.key} onClick={() => setActivePhase(p.key)} className={cn('w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all',
                  active ? 'bg-primary/10' : 'hover:bg-muted/40')}>
                <div className={cn('h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
                  fullyDone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600' :
                  p.weightedPct > 0 ? 'bg-amber-500/20 border-amber-500 text-amber-600' : 'bg-muted border-border/60 text-muted-foreground')}>
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[12px] font-semibold leading-tight truncate', active ? 'text-primary' : 'text-foreground/80')}>
                    {p.title.replace(/^Phase \d+ — /, '')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.subtitle}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full bg-emerald-500/70" style={{ width: `${p.weightedPct}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground font-medium">{p.weightedPct}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <div className="space-y-5">
          {loading && (
            <div className="rounded-2xl border border-border/40 bg-card/50 p-12 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && visiblePhases.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-card/50 p-12 text-center text-sm text-muted-foreground">
              No tasks match this filter.
            </div>
          )}
          {!loading && visiblePhases.map(phase => (
            <section key={phase.key} className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
              <header className="px-5 py-3 border-b border-border/30 bg-muted/10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">{phase.title}</h2>
                  <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="tabular-nums text-xs">{phase.doneCount}/{phase.totalCount}</Badge>
                  <Badge variant="outline" className="tabular-nums text-[10px] bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">{phase.weightedPct}%</Badge>
                </div>
              </header>
              <ul className="divide-y divide-border/20">
                {phase.resolvedTasks.map(task => <TaskRow key={task.key} task={task} />)}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: ResolvedTask }) {
  const meta = STATUS_META[task.status];
  const Icon = meta.icon;
  const SourceIcon = task.source === 'manual' ? Hand
    : task.source === 'probe-async' ? Database
    : task.source === 'probe' ? Cpu : null;
  return (
    <li>
      <Link to={`/admin/roadmap/${encodeURIComponent(task.key)}`}
        className="w-full text-left px-5 py-3 hover:bg-muted/20 transition-colors flex items-start gap-3 group">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5',
          task.status === 'done' ? 'text-emerald-500' :
          task.status === 'in_progress' ? 'text-amber-500' :
          task.status === 'blocked' ? 'text-rose-500' : 'text-muted-foreground/40')} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-sm font-semibold leading-tight', task.status === 'done' && 'text-muted-foreground line-through decoration-1')}>
              {task.title}
            </p>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wider', meta.pill)}>
              {meta.label}
            </span>
            {SourceIcon && (
              <span className="text-[10px] text-muted-foreground/60 font-medium flex items-center gap-1">
                <SourceIcon className="h-3 w-3" />{task.source}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{task.description}</p>
          {task.status === 'in_progress' && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-amber-500/15 overflow-hidden max-w-[200px]">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${task.progress ?? 50}%` }} />
              </div>
              <span className="text-[10px] tabular-nums font-semibold text-amber-600">{task.progress ?? 50}%</span>
            </div>
          )}
          {task.note && <p className="text-xs italic text-muted-foreground/80 mt-1">— {task.note}</p>}
          {task.updatedAt && (
            <p className="text-[10px] text-muted-foreground/50 mt-1">Verified {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors mt-1" />
      </Link>
    </li>
  );
}
