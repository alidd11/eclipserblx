import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {} formatRelative } from '@/lib/dateUtils';
import { ApplicationDetailDialog } from '@/components/admin/store-applications/ApplicationDetailDialog';

interface VerificationResults {
  discord_server?: { valid: boolean; is_permanent: boolean; guild_name?: string; member_count?: number; error?: string };
  roblox_group?: { in_group: boolean; group_name?: string; role?: string; rank?: number; error?: string };
  roblox_badges?: { required: string[]; owned: string[]; missing: string[]; all_owned: boolean };
  account_age?: { days: number; meets_requirement: boolean; required_days: number };
  email_verified?: boolean;
  purchase_history?: { count: number; total_spent: number; meets_requirement: boolean; required_count: number };
  identity_consistency?: { discord_username: string; roblox_username: string; similarity_score: number; is_consistent: boolean };
}

interface StoreApplication {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  product_category: string | null;
  expected_products: string | null;
  portfolio_url: string | null;
  experience: string | null;
  discord_server_invite: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  verification_results?: VerificationResults;
  profiles?: {
    display_name: string | null;
    email: string;
    customer_id: string | null;
    discord_username: string | null;
    roblox_username: string | null;
  };
}

export default function StoreApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<StoreApplication | null>(null);
  const [storeAppTab, setStoreAppTab] = useState('pending');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['admin-store-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_applications')
        .select(`*, profiles:user_id (display_name, username, email, customer_id, discord_username, roblox_username)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StoreApplication[];
    } });

  const approveApplication = useMutation({
    mutationFn: async (application: StoreApplication) => {
      const { error: updateError } = await supabase.from('store_applications').update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', application.id);
      if (updateError) throw updateError;

      const baseSlug = application.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug;
      const { data: existing } = await supabase.from('stores').select('id').eq('slug', baseSlug).maybeSingle();
      if (existing) slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      const { data: store, error: storeError } = await supabase.from('stores').insert({
        owner_id: application.user_id, name: application.store_name, slug, description: application.store_description,
        discord_url: application.discord_server_invite, status: 'approved', is_active: true, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as any).select().single();
      if (storeError) throw storeError;

      const { error: balanceError } = await supabase.from('seller_balances').insert({ user_id: application.user_id, store_id: store.id } as any);
      if (balanceError) throw balanceError;

      await supabase.from('profiles').update({ accounts_locked: true, accounts_locked_at: new Date().toISOString() }).eq('user_id', application.user_id);

      try {
        await supabase.functions.invoke('send-seller-application-status', {
          body: { seller_name: application.profiles?.display_name || 'Seller', seller_email: application.profiles?.email, store_name: application.store_name, status: 'approved' } });
      } catch (e) { console.error('Failed to send approval email:', e); }

      return store;
    },
    onSuccess: () => { toast.success('Application Approved', { description: 'Store has been created successfully.' }); queryClient.invalidateQueries({ queryKey: ['admin-store-applications'] }); setSelectedApplication(null); },
    onError: (error) => { toast.error('Error', { description: error.message }); } });

  const rejectApplication = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const app = applications?.find(a => a.id === id);
      const { error } = await supabase.from('store_applications').update({ status: 'rejected', rejection_reason: reason, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      if (app?.profiles?.email) {
        try {
          await supabase.functions.invoke('send-seller-application-status', {
            body: { seller_name: app.profiles?.display_name || 'Seller', seller_email: app.profiles.email, store_name: app.store_name, status: 'rejected', rejection_reason: reason } });
        } catch (e) { console.error('Failed to send rejection email:', e); }
      }
    },
    onSuccess: () => { toast.success('Application Rejected'); queryClient.invalidateQueries({ queryKey: ['admin-store-applications'] }); setSelectedApplication(null); },
    onError: (error) => { toast.error('Error', { description: error.message }); } });

  const pendingApps = applications?.filter(a => a.status === 'pending') || [];
  const approvedApps = applications?.filter(a => a.status === 'approved') || [];
  const rejectedApps = applications?.filter(a => a.status === 'rejected') || [];

  const getVerificationScore = (results?: VerificationResults) => {
    if (!results) return { passed: 0, total: 0 };
    let passed = 0, total = 0;
    if (results.account_age) { total++; if (results.account_age.meets_requirement) passed++; }
    if (typeof results.email_verified === 'boolean') { total++; if (results.email_verified) passed++; }
    if (results.discord_server) { total++; if (results.discord_server.valid && results.discord_server.is_permanent) passed++; }
    if (results.roblox_group) { total++; if (results.roblox_group.in_group) passed++; }
    if (results.purchase_history) { total++; if (results.purchase_history.meets_requirement) passed++; }
    if (results.identity_consistency) { total++; if (results.identity_consistency.is_consistent) passed++; }
    return { passed, total };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return null;
    }
  };

  const ApplicationCard = ({ app }: { app: StoreApplication }) => {
    const score = getVerificationScore(app.verification_results);
    const hasWarnings = score.total > 0 && score.passed < score.total;
    return (
      <div className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedApplication(app)}>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{app.store_name}</h3>
              <p className="text-sm text-muted-foreground">by {app.profiles?.display_name || 'Unknown'} {app.profiles?.customer_id && <span className="font-mono text-xs">({app.profiles.customer_id})</span>}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasWarnings && (
                <TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-yellow-500" /></TooltipTrigger><TooltipContent><p>Verification issues detected</p></TooltipContent></Tooltip></TooltipProvider>
              )}
              {getStatusBadge(app.status)}
            </div>
          </div>
          {app.store_description && <p className="text-sm text-muted-foreground line-clamp-2">{app.store_description}</p>}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {app.product_category && <span className="bg-muted px-2 py-0.5 rounded">{app.product_category}</span>}
            {score.total > 0 && (
              <span className={`flex items-center gap-1 ${score.passed === score.total ? 'text-green-500' : 'text-yellow-500'}`}><Shield className="h-3 w-3" />{score.passed}/{score.total}</span>
            )}
            <span>{formatRelative(app.created_at)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = (apps: StoreApplication[], emptyText: string) => {
    if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (apps.length === 0) return <div className="text-center py-8 text-muted-foreground">{emptyText}</div>;
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{apps.map(app => <ApplicationCard key={app.id} app={app} />)}</div>;
  };

  return (
    <AdminLayout requiredPermissions={['view_store_applications']}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Store Applications</h1>
          <p className="text-muted-foreground">Review and manage seller applications</p>
        </div>

        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground"><span className="font-semibold text-yellow-500">{pendingApps.length}</span> pending</span>
          <span className="text-muted-foreground"><span className="font-semibold text-green-500">{approvedApps.length}</span> approved</span>
          <span className="text-muted-foreground"><span className="font-semibold text-destructive">{rejectedApps.length}</span> rejected</span>
        </div>

        <Tabs value={storeAppTab} onValueChange={setStoreAppTab}>
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="pending">Pending ({pendingApps.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedApps.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedApps.length})</TabsTrigger>
          </TabsList>
          <div className="sm:hidden">
            <Select value={storeAppTab} onValueChange={setStoreAppTab}>
              <SelectTrigger className="w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending ({pendingApps.length})</SelectItem>
                <SelectItem value="approved">Approved ({approvedApps.length})</SelectItem>
                <SelectItem value="rejected">Rejected ({rejectedApps.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsContent value="pending" className="mt-4">{renderTabContent(pendingApps, 'No pending applications')}</TabsContent>
          <TabsContent value="approved" className="mt-4">{renderTabContent(approvedApps, 'No approved applications')}</TabsContent>
          <TabsContent value="rejected" className="mt-4">{renderTabContent(rejectedApps, 'No rejected applications')}</TabsContent>
        </Tabs>

        <ApplicationDetailDialog
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onApprove={(app) => approveApplication.mutate(app)}
          onReject={(id, reason) => rejectApplication.mutate({ id, reason })}
          isApproving={approveApplication.isPending}
          isRejecting={rejectApplication.isPending}
        />
      </div>
    </AdminLayout>
  );
}
