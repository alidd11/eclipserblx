import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, ExternalLink, Search, Store, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PermissionGate } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { formatRelative } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface ApplicantProfile {
  display_name: string | null;
  email: string | null;
  username: string | null;
  discord_username: string | null;
  roblox_username: string | null;
}

interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  portfolio_url: string | null;
  experience: string | null;
  discord_server_invite: string | null;
  age_confirmed: boolean;
  terms_accepted: boolean;
  status: ApplicationStatus;
  auto_approved: boolean | null;
  created_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  verification_results: unknown;
  profiles: ApplicantProfile | null;
}

interface ReviewStoreApplicationArgs {
  p_application_id: string;
  p_decision: 'approved' | 'rejected';
  p_rejection_reason: string | null;
  p_notes: string | null;
}

type ReviewStoreApplicationRpc = (
  functionName: 'review_store_application',
  args: ReviewStoreApplicationArgs,
) => PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

const statusStyle: Record<ApplicationStatus, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rejected: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
};

function profileFromJoin(value: ApplicantProfile | ApplicantProfile[] | null): ApplicantProfile | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function StoreApplications() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StoreApplication | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['admin-store-applications'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('store_applications')
        .select(`
          id, user_id, store_name, store_description, product_category,
          portfolio_url, experience, discord_server_invite, status,
          age_confirmed, terms_accepted, auto_approved, created_at, reviewed_at, rejection_reason, notes,
          verification_results,
          profiles!store_applications_user_id_fkey(
            display_name, email, username, discord_username, roblox_username
          )
        `)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      return (data ?? []).map((application) => ({
        ...application,
        profiles: profileFromJoin(application.profiles as ApplicantProfile | ApplicantProfile[] | null),
      })) as StoreApplication[];
    },
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return applications.filter((application) => {
      if (status !== 'all' && application.status !== status) return false;
      if (!needle) return true;
      const profile = application.profiles;
      return [
        application.store_name,
        profile?.display_name,
        profile?.username,
        profile?.email,
        profile?.discord_username,
        profile?.roblox_username,
      ].some((value) => value?.toLowerCase().includes(needle));
    });
  }, [applications, search, status]);

  const counts = useMemo(() => ({
    pending: applications.filter((item) => item.status === 'pending').length,
    approved: applications.filter((item) => item.status === 'approved').length,
    rejected: applications.filter((item) => item.status === 'rejected').length,
  }), [applications]);
  const selectedDiscordInvite = safeExternalUrl(selected?.discord_server_invite);
  const selectedPortfolioUrl = safeExternalUrl(selected?.portfolio_url);

  const closeDecision = () => {
    setDecision(null);
    setRejectionReason('');
    setNotes('');
  };

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !decision) throw new Error('Select a review decision');
      if (decision === 'rejected' && !rejectionReason.trim()) {
        throw new Error('A rejection reason is required');
      }

      const reviewStoreApplication = supabase.rpc as unknown as ReviewStoreApplicationRpc;
      const { data, error: reviewError } = await reviewStoreApplication('review_store_application', {
        p_application_id: selected.id,
        p_decision: decision,
        p_rejection_reason: decision === 'rejected' ? rejectionReason.trim() : null,
        p_notes: notes.trim() || null,
      });
      if (reviewError) throw new Error(reviewError.message);
      return data as { status: ApplicationStatus; already_reviewed?: boolean };
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-store-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['mod-queue-stores'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-overview-snapshot'] }),
        queryClient.invalidateQueries({ queryKey: ['seller-commissions'] }),
      ]);
      toast.success(
        result.already_reviewed
          ? 'Application was already reviewed'
          : `Store application ${result.status}`,
      );
      closeDecision();
      setSelected(null);
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || 'Unable to review application');
    },
  });

  return (
    <AdminLayout requiredPermissions={['view_store_applications', 'review_store_applications']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-display font-bold">Store Applications</h1>
            </div>
            <p className="mt-1 text-muted-foreground">
              Review every seller before their store and dashboard access are activated.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(['pending', 'approved', 'rejected'] as const).map((itemStatus) => (
              <button
                key={itemStatus}
                type="button"
                onClick={() => setStatus(itemStatus)}
                className="rounded-xl border border-border bg-card px-4 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="block text-lg font-semibold">{counts[itemStatus]}</span>
                <span className="text-xs capitalize text-muted-foreground">{itemStatus}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search store, applicant, email, Discord or Roblox…"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All applications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
              <p className="font-medium">Applications could not be loaded</p>
              <p className="mt-1 text-sm text-muted-foreground">{(error as Error).message}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <Skeleton key={item} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-medium">{status === 'pending' ? 'Review queue is clear' : 'No applications found'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {status === 'pending' ? 'New applications will appear here automatically.' : 'Try a different filter or search.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((application) => (
              <button
                key={application.id}
                type="button"
                onClick={() => setSelected(application)}
                className="rounded-xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{application.store_name}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {application.profiles?.display_name || application.profiles?.username || 'Unnamed applicant'}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusStyle[application.status]}>
                    {application.status}
                  </Badge>
                </div>
                <p className="mt-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {application.store_description || 'No store description supplied.'}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{application.product_category || 'Uncategorised'}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {application.created_at ? formatRelative(application.created_at) : 'Unknown'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected && !decision} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.store_name || 'Store application'}</DialogTitle>
            <DialogDescription>
              Review the applicant identity, store proposal and linked community before deciding.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Applicant</p>
                  <p className="mt-1 text-sm font-medium">
                    {selected.profiles?.display_name || selected.profiles?.username || 'Not provided'}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.profiles?.email || 'No email available'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked accounts</p>
                  <p className="mt-1 text-sm">Discord: {selected.profiles?.discord_username || 'Not linked'}</p>
                  <p className="text-sm">Roblox: {selected.profiles?.roblox_username || 'Not linked'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant={selected.profiles?.discord_username ? 'secondary' : 'destructive'}>
                  Discord {selected.profiles?.discord_username ? 'linked' : 'not linked'}
                </Badge>
                <Badge variant={selected.profiles?.roblox_username ? 'secondary' : 'destructive'}>
                  Roblox {selected.profiles?.roblox_username ? 'linked' : 'not linked'}
                </Badge>
                <Badge variant={selected.age_confirmed ? 'secondary' : 'destructive'}>
                  Age {selected.age_confirmed ? 'confirmed' : 'not confirmed'}
                </Badge>
                <Badge variant={selected.terms_accepted ? 'secondary' : 'destructive'}>
                  Terms {selected.terms_accepted ? 'accepted' : 'not accepted'}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium">Store description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {selected.store_description || 'No description supplied.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">Product category</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.product_category || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Experience</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.experience || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedDiscordInvite && (
                  <Button asChild size="sm" variant="outline">
                    <a href={selectedDiscordInvite} target="_blank" rel="noopener noreferrer">
                      Check Discord <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                {selectedPortfolioUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={selectedPortfolioUrl} target="_blank" rel="noopener noreferrer">
                      View portfolio <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </div>

              {selected.rejection_reason && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">Rejection reason</p>
                  <p className="mt-1 text-sm">{selected.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            {selected?.status === 'pending' && (
              <PermissionGate permission="review_store_applications">
                <Button variant="destructive" onClick={() => setDecision('rejected')}>
                  <XCircle className="mr-1 h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => setDecision('approved')}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Approve store
                </Button>
              </PermissionGate>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decision} onOpenChange={(open) => !open && closeDecision()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'approved' ? 'Approve this store?' : 'Reject this application?'}</DialogTitle>
            <DialogDescription>
              {decision === 'approved'
                ? 'Approval immediately activates the store and seller dashboard access. This action is recorded in the audit log.'
                : 'The applicant will see your reason and may submit a new application after addressing it.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {decision === 'rejected' && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection reason</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain what the applicant should correct before reapplying…"
                  rows={4}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="review-notes">Internal notes (optional)</Label>
              <Textarea
                id="review-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes for other administrators…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDecision} disabled={reviewMutation.isPending}>Cancel</Button>
            <Button
              variant={decision === 'rejected' ? 'destructive' : 'default'}
              disabled={reviewMutation.isPending || (decision === 'rejected' && !rejectionReason.trim())}
              onClick={() => reviewMutation.mutate()}
            >
              {reviewMutation.isPending ? 'Saving…' : decision === 'approved' ? 'Approve and activate' : 'Reject application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
