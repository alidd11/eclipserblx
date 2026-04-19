import { fileExists, fileContains } from './probeManifest';
import { supabase } from '@/integrations/supabase/client';
import { fetchReadinessFacts, getReadinessFact, readinessFactsReady } from './readinessFacts';
import type { RoadmapStatus, RoadmapTask } from './tasks';

/**
 * Synchronous probe — runs at render time. Returns a status, or null if the
 * probe spec isn't recognized or needs async resolution.
 */
export function runProbe(task: RoadmapTask): RoadmapStatus | null {
  const spec = task.probe;
  if (!spec) return null;
  const [kind, ...rest] = spec.split(':');
  const arg = rest.join(':');

  switch (kind) {
    case 'fileExists':
      return fileExists(arg) ? 'done' : (task.seed ?? 'todo');

    case 'contentMatches': {
      const idx = arg.indexOf(':');
      if (idx < 0) return null;
      const path = arg.slice(0, idx);
      const needle = arg.slice(idx + 1);
      return fileContains(path, needle) ? 'done' : (task.seed ?? 'todo');
    }

    case 'secret': {
      if (!readinessFactsReady()) return null;
      const v = getReadinessFact(arg);
      if (typeof v !== 'boolean') return task.seed ?? 'todo';
      return v ? 'done' : (task.seed ?? 'todo');
    }

    case 'db':
      return null;

    default:
      return null;
  }
}

/**
 * Async probe runner — verifies tasks against live database state or
 * server-side env vars. Results are merged into the resolved task list once
 * the network round-trip completes.
 */
export async function runAsyncProbe(task: RoadmapTask): Promise<RoadmapStatus | null> {
  const spec = task.probe;
  if (!spec) return null;

  if (spec.startsWith('secret:')) {
    const arg = spec.slice('secret:'.length);
    const facts = await fetchReadinessFacts();
    if (!facts) return null;
    const v = facts[arg];
    if (typeof v !== 'boolean') return task.seed ?? 'todo';
    return v ? 'done' : (task.seed ?? 'todo');
  }

  if (!spec.startsWith('db:')) return null;
  const [, kind, ...rest] = spec.split(':');
  const arg = rest.join(':');

  try {
    if (kind === 'rowExists') {
      const { count, error } = await (supabase.from as any)(arg)
        .select('*', { count: 'exact', head: true })
        .limit(1);
      if (error) return null;
      return (count ?? 0) > 0 ? 'done' : (task.seed ?? 'todo');
    }
    if (kind === 'functionExists') {
      const { error } = await supabase.rpc(arg as any, {} as any);
      if (!error) return 'done';
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('does not exist') || msg.includes('not found')) {
        return task.seed ?? 'todo';
      }
      return 'done';
    }
  } catch {
    return null;
  }
  return null;
}

/** Human-readable explanation of how the probe verifies the task. */
export function explainProbe(spec?: string): string {
  if (!spec) return 'No automated probe — falls back to the seeded status.';
  const [kind, ...rest] = spec.split(':');
  const arg = rest.join(':');
  switch (kind) {
    case 'fileExists':
      return `Marked done when any tracked file exists at or under \`${arg}\`.`;
    case 'contentMatches': {
      const idx = arg.indexOf(':');
      const path = idx >= 0 ? arg.slice(0, idx) : arg;
      const needle = idx >= 0 ? arg.slice(idx + 1) : '';
      return `Marked done when \`${path}\` is tracked AND its source contains \`${needle}\`.`;
    }
    case 'secret':
      return `Marked done when the server-side secret \`${arg}\` is configured (verified via the verify-platform-readiness edge function — values are never sent to the client).`;
    case 'db': {
      const [sub, ...rest2] = arg.split(':');
      const a = rest2.join(':');
      if (sub === 'rowExists') return `Marked done when at least one row exists in \`public.${a}\`.`;
      if (sub === 'functionExists') return `Marked done when the Postgres function \`${a}()\` is callable.`;
      return `Database probe: ${arg}`;
    }
    default:
      return `Probe: ${spec}`;
  }
}
