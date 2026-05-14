import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ALL_TASKS, ROADMAP_PHASES, type RoadmapStatus, type RoadmapTask } from '@/lib/roadmap/tasks';
import { runProbe, runAsyncProbe } from '@/lib/roadmap/probes';

export interface ResolvedTask extends RoadmapTask {
  status: RoadmapStatus;
  source: 'manual' | 'probe' | 'seed' | 'probe-async';
  note?: string;
  updatedAt?: string;
}

interface OverrideRow {
  task_key: string;
  status: RoadmapStatus;
  note: string | null;
  updated_at: string;
}

export function useRoadmapStatus() {
  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [asyncProbes, setAsyncProbes] = useState<Record<string, RoadmapStatus>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_roadmap_status')
      .select('task_key, status, note, updated_at');
    if (!error && data) {
      const map: Record<string, OverrideRow> = {};
      for (const row of data as OverrideRow[]) map[row.task_key] = row;
      setOverrides(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const candidates = ALL_TASKS.filter(t => {
      if (overrides[t.key]) return false;
      const p = t.probe;
      return p?.startsWith('db:') || p?.startsWith('secret:');
    });
    if (candidates.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        candidates.map(async t => [t.key, await runAsyncProbe(t)] as const)
      );
      if (cancelled) return;
      setAsyncProbes(prev => {
        const next = { ...prev };
        for (const [k, v] of results) if (v) next[k] = v;
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [overrides]);

  const setStatus = useCallback(async (task_key: string, status: RoadmapStatus, note?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    const { error } = await supabase
      .from('platform_roadmap_status')
      .upsert({ task_key, status, note: note ?? null, updated_by: user?.id ?? null, updated_at: new Date().toISOString() });
    if (!error) load();
    return !error;
  }, [load]);

  const clearOverride = useCallback(async (task_key: string) => {
    const { error } = await supabase
      .from('platform_roadmap_status')
      .delete()
      .eq('task_key', task_key);
    if (!error) load();
    return !error;
  }, [load]);

  const resolved = useMemo<ResolvedTask[]>(() => {
    return ALL_TASKS.map(task => {
      const override = overrides[task.key];
      if (override) {
        return { ...task, status: override.status, source: 'manual', note: override.note ?? undefined, updatedAt: override.updated_at };
      }
      const async_ = asyncProbes[task.key];
      if (async_) return { ...task, status: async_, source: 'probe-async' };
      const probed = runProbe(task);
      if (probed) return { ...task, status: probed, source: 'probe' };
      return { ...task, status: task.seed ?? 'todo', source: 'seed' };
    });
  }, [overrides, asyncProbes]);

  const byKey = useMemo(() => {
    const m: Record<string, ResolvedTask> = {};
    for (const t of resolved) m[t.key] = t;
    return m;
  }, [resolved]);

  const phases = useMemo(() => {
    return ROADMAP_PHASES.map(phase => {
      const tasks = phase.tasks.map(t => byKey[t.key]);
      const done = tasks.filter(t => t.status === 'done').length;
      const credit = tasks.reduce((sum, t) => {
        if (t.status === 'done') return sum + 1;
        if (t.status === 'in_progress') return sum + ((t.progress ?? 50) / 100);
        return sum;
      }, 0);
      const weightedPct = tasks.length === 0 ? 0 : Math.round((credit / tasks.length) * 100);
      return { ...phase, resolvedTasks: tasks, doneCount: done, totalCount: tasks.length, weightedPct };
    });
  }, [byKey]);

  const totals = useMemo(() => {
    const done = resolved.filter(t => t.status === 'done').length;
    const inProgress = resolved.filter(t => t.status === 'in_progress').length;
    const blocked = resolved.filter(t => t.status === 'blocked').length;
    const todo = resolved.filter(t => t.status === 'todo').length;
    const credit = resolved.reduce((sum, t) => {
      if (t.status === 'done') return sum + 1;
      if (t.status === 'in_progress') return sum + ((t.progress ?? 50) / 100);
      return sum;
    }, 0);
    const weightedPct = resolved.length === 0 ? 0 : Math.round((credit / resolved.length) * 100);
    return { done, inProgress, blocked, todo, total: resolved.length, weightedPct };
  }, [resolved]);

  return { loading, resolved, byKey, phases, totals, setStatus, clearOverride, refresh: load };
}
