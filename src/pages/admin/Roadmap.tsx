import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Gauge,
  ShieldCheck,
  Sparkles,
  Search as SearchIcon,
  Activity,
  Code2,
  Banknote,
  ChevronDown,
  CheckCircle2,
  Circle,
  CircleDot,
  Ban,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  pillar: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  verification_probe: string | null;
  completion_notes: string | null;
  display_order: number;
  completed_at: string | null;
  updated_at: string;
}

const PILLARS = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'ux', label: 'UX & A11y', icon: Sparkles },
  { id: 'seo', label: 'SEO', icon: SearchIcon },
  { id: 'reliability', label: 'Reliability', icon: Activity },
  { id: 'code', label: 'Code Health', icon: Code2 },
  { id: 'business', label: 'Business', icon: Banknote },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-destructive/15 text-destructive border-destructive/30',
  P1: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  P2: 'bg-muted text-muted-foreground border-border',
};

const STATUS_META: Record<RoadmapItem['status'], { label: string; icon: typeof Circle; className: string }> = {
  todo: { label: 'To Do', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: CircleDot, className: 'text-blue-500' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-emerald-500' },
  blocked: { label: 'Blocked', icon: Ban, className: 'text-destructive' },
};

const STATUS_OPTIONS: RoadmapItem['status'][] = ['todo', 'in_progress', 'done', 'blocked'];

export default function AdminRoadmap() {
  const { isLeadAdministrator, loading } = useAdminAuth();
  const qc = useQueryClient();
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [notesDraft, setNotesDraft] = useState('');

  const { data: items, isLoading } = useQuery({
    queryKey: ['roadmap-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('*')
        .order('priority', { ascending: true })
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as RoadmapItem[];
    },
    enabled: isLeadAdministrator,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RoadmapItem['status'] }) => {
      const { error } = await supabase.from('roadmap_items').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap-items'] });
      toast.success('Status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('roadmap_items')
        .update({ completion_notes: notes })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap-items'] });
      setEditing(null);
      toast.success('Notes saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!items) return [];
    return pillarFilter === 'all' ? items : items.filter(i => i.pillar === pillarFilter);
  }, [items, pillarFilter]);

  const stats = useMemo(() => {
    const all = items ?? [];
    const done = all.filter(i => i.status === 'done').length;
    const blockers = all.filter(i => i.priority === 'P0' && i.status !== 'done').length;
    const inProgress = all.filter(i => i.status === 'in_progress').length;
    const pct = all.length === 0 ? 0 : Math.round((done / all.length) * 100);
    return { total: all.length, done, blockers, inProgress, pct };
  }, [items]);

  if (loading) {
    return (
      <AdminLayout>
        <Skeleton className="h-32 w-full" />
      </AdminLayout>
    );
  }

  if (!isLeadAdministrator) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Production Roadmap"
          description="Lead Administrator only. Track every fix, probe, and verification step on the path to a production-ready public release."
        />

        {/* Restricted-access banner */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Restricted: visible only to the Lead Administrator role.
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total items" value={stats.total} />
          <StatCard label="Completed" value={stats.done} accent="emerald" />
          <StatCard label="In progress" value={stats.inProgress} accent="blue" />
          <StatCard label="P0 blockers" value={stats.blockers} accent="destructive" />
        </div>

        {/* Overall progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Production readiness</span>
            <span className="text-sm text-muted-foreground">{stats.pct}%</span>
          </div>
          <Progress value={stats.pct} className="h-2" />
        </Card>

        {/* Pillar tabs */}
        <Tabs value={pillarFilter} onValueChange={setPillarFilter}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/30 p-1">
            {PILLARS.map(p => {
              const Icon = p.icon;
              const count =
                p.id === 'all'
                  ? items?.length ?? 0
                  : items?.filter(i => i.pillar === p.id).length ?? 0;
              return (
                <TabsTrigger key={p.id} value={p.id} className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{p.label}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={pillarFilter} className="mt-4 space-y-2">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                No items in this pillar yet.
              </p>
            ) : (
              filtered.map(item => (
                <RoadmapRow
                  key={item.id}
                  item={item}
                  onStatusChange={(status) => updateStatus.mutate({ id: item.id, status })}
                  onEditNotes={() => {
                    setEditing(item);
                    setNotesDraft(item.completion_notes ?? '');
                  }}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Notes / probe dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.title}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {editing.description && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{editing.description}</p>
                </div>
              )}
              {editing.verification_probe && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Verification probe</p>
                  <pre className="text-xs bg-muted/50 rounded-md p-3 whitespace-pre-wrap font-mono border border-border">
                    {editing.verification_probe}
                  </pre>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Completion notes</p>
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Record findings, evidence, links to PRs, screenshots…"
                  rows={6}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing && updateNotes.mutate({ id: editing.id, notes: notesDraft })}
              disabled={updateNotes.isPending}
            >
              Save notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'emerald' | 'blue' | 'destructive';
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-500'
      : accent === 'blue'
      ? 'text-blue-500'
      : accent === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accentClass}`}>{value}</p>
    </Card>
  );
}

function RoadmapRow({
  item,
  onStatusChange,
  onEditNotes,
}: {
  item: RoadmapItem;
  onStatusChange: (s: RoadmapItem['status']) => void;
  onEditNotes: () => void;
}) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;
  return (
    <Card className="p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${meta.className}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[item.priority]}`}>
                {item.priority}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {item.pillar}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  {meta.label}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map(s => {
                  const m = STATUS_META[s];
                  const SI = m.icon;
                  return (
                    <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
                      <SI className={`h-3.5 w-3.5 mr-2 ${m.className}`} />
                      {m.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEditNotes}>
              {item.completion_notes ? 'Edit notes' : 'Add notes / view probe'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
