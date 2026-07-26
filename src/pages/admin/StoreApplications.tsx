import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PermissionGate, useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ShieldQuestion, ExternalLink, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePageMeta } from '@/hooks/usePageMeta';

type AppRow = {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  discord_server_invite: string | null;
  status: string;
  auto_approved: boolean | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  approved_store_id: string | null;
  verification_results: any;
  created_at: string;
  profiles?: { display_name: string | null; username: string | null } | null;
};

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'pending' ? 'secondary'
    : status === 'approved' ? 'default'
    : status === 'rejected' ? 'destructive'
    : 'outline';
  return <Badge variant={variant as any} className="capitalize">{status}</Badge>;
}

function ApplicationCard({ app, onReview }: { app: AppRow; onReview: (a: AppRow, decision: 'approved' | 'rejected') => void }) {
  const { hasPermission } = useUserPermissions();
  const canReview = hasPermission('review_store_applications');
  const displayName = app.profiles?.display_name || app.profiles?.username || app.user_id.slice(0, 8);
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{app.store_name}</h3>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            by {displayName} · submitted {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {app.store_description && (
        <p className="text-sm text-foreground/90 whitespace-pre-line">{app.store_description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {app.product_category && (
          <div><span className="text-muted-foreground">Category:</span> {app.product_category}</div>
        )}
        {app.discord_server_invite && (
          <div className="truncate">
            <span className="text-muted-foreground">Discord:</span>{' '}
            <a href={app.discord_server_invite} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
              invite <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {app.verification_results && Object.keys(app.verification_results || {}).length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs flex gap-2">
          <ShieldQuestion className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
          <div className="min-w-0">
            <p className="font-medium text-warning-foreground">Unverified client evidence</p>
            <p className="text-muted-foreground mt-0.5">
              The applicant's browser reported the following. Treat as unverified until you confirm it manually.
            </p>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[11px] leading-snug">
              {JSON.stringify(app.verification_results, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {app.status === 'rejected' && app.rejection_reason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
          <p className="font-medium text-destructive-foreground">Reason</p>
          <p className="text-muted-foreground mt-0.5">{app.rejection_reason}</p>
        </div>
      )}

      {app.status === 'approved' && app.approved_store_id && (
        <p className="text-xs text-muted-foreground">Linked store: <code className="font-mono">{app.approved_store_id}</code></p>
      )}

      {app.status === 'pending' && canReview && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => onReview(app, 'approved')}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onReview(app, 'rejected')}>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function AdminStoreApplicationsInner() {
  usePageMeta({ title: 'Store Applications · Admin', description: 'Review pending seller applications.' });
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [dialog, setDialog] = useState<{ app: AppRow; decision: 'approved' | 'rejected' } | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin-store-applications', tab],
    queryFn: async () => {
      const query = supabase
        .from('store_applications')
        .select('id, user_id, store_name, store_description, product_category, discord_server_invite, status, auto_approved, reviewed_by, reviewed_at, rejection_reason, approved_store_id, verification_results, created_at, profiles:profiles!store_applications_user_id_fkey(display_name, username)')
        .order('created_at', { ascending: false })
        .limit(200);
      const { data, error } = tab === 'pending'
        ? await query.eq('status', 'pending')
        : await query.in('status', ['approved', 'rejected', 'withdrawn']);
      if (error) throw error;
      return (data ?? []) as unknown as AppRow[];
    },
    refetchOnMount: 'always',
    staleTime: 30_000,
  });

  const review = useMutation({
    mutationFn: async ({ app, decision, rejection_reason }: { app: AppRow; decision: 'approved' | 'rejected'; rejection_reason?: string }) => {
      const { data, error } = await supabase.rpc('review_store_application', {
        _application_id: app.id,
        _decision: decision,
        _rejection_reason: rejection_reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.decision === 'approved' ? 'Application approved' : 'Application rejected');
      setDialog(null);
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin-store-applications'] });
      qc.invalidateQueries({ queryKey: ['admin-overview-snapshot'] });
      qc.invalidateQueries({ queryKey: ['mod-queue-store-apps'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Review failed');
    },
  });

  const openReview = (app: AppRow, decision: 'approved' | 'rejected') => {
    setReason('');
    setDialog({ app, decision });
  };

  const confirmReview = () => {
    if (!dialog) return;
    if (dialog.decision === 'rejected' && reason.trim().length < 5) {
      toast.error('Please give a reason of at least 5 characters');
      return;
    }
    review.mutate({
      app: dialog.app,
      decision: dialog.decision,
      rejection_reason: dialog.decision === 'rejected' ? reason.trim() : undefined,
    });
  };

  const pendingCount = useMemo(
    () => (tab === 'pending' ? data?.length ?? 0 : undefined),
    [tab, data],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Store Applications"
        description="Review seller applications. Decisions run through a permission-checked, transactional RPC."
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending{pendingCount !== undefined ? ` (${pendingCount})` : ''}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Failed to load applications.
              <Button size="sm" variant="ghost" onClick={() => refetch()}>Retry</Button>
            </div>
          )}
          {!isLoading && !isError && (data?.length ?? 0) === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {tab === 'pending' ? 'No pending applications.' : 'No historical applications.'}
            </div>
          )}
          {data?.map((app) => (
            <ApplicationCard key={app.id} app={app} onReview={openReview} />
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!dialog} onOpenChange={(o) => { if (!o) { setDialog(null); setReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.decision === 'approved' ? 'Approve this application?' : 'Reject this application?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.decision === 'approved'
                ? `A store will be created for ${dialog?.app.store_name} and the seller role granted. This runs atomically.`
                : 'The applicant will be notified. They can resubmit after correcting the issue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialog?.decision === 'rejected' && (
            <div className="space-y-2">
              <label htmlFor="reject-reason" className="text-sm font-medium">Reason (required, min 5 chars)</label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Explain briefly why this application is being rejected…"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={review.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmReview(); }}
              disabled={review.isPending || (dialog?.decision === 'rejected' && reason.trim().length < 5)}
            >
              {review.isPending ? 'Working…' : dialog?.decision === 'approved' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminStoreApplications() {
  return (
    <PermissionGate
      permission="review_store_applications"
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You do not have permission to review store applications.
        </div>
      }
    >
      <AdminStoreApplicationsInner />
    </PermissionGate>
  );
}
