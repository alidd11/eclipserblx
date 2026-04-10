import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Shield, ExternalLink, Package, TrendingUp, DollarSign, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { GenerateStoreBranding } from '@/components/admin/GenerateStoreBranding';
import { ADMIN_MANAGED_STORES } from '@/lib/constants';
import { StoreOwnerCard } from '@/components/admin/store-detail/StoreOwnerCard';
import { StoreCommissionCard } from '@/components/admin/store-detail/StoreCommissionCard';
import { StoreControlsCard } from '@/components/admin/store-detail/StoreControlsCard';

export default function SellerStoreDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isAdminManagedStore = storeId ? ADMIN_MANAGED_STORES.includes(storeId as any) : false;

  const { data: store, isLoading } = useQuery({
    queryKey: ['seller-store-detail', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`*, profiles:owner_id (display_name, username, email, avatar_url, discord_id, discord_username, roblox_user_id, roblox_username, customer_id, accounts_locked, accounts_locked_at)`)
        .eq('id', storeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const { data: paymentDetails } = useQuery({
    queryKey: ['store-payment-details', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_payment_details')
        .select('stripe_account_id, payouts_enabled, details_submitted')
        .eq('store_id', storeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const { data: stats } = useQuery({
    queryKey: ['seller-store-stats', storeId],
    queryFn: async () => {
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId);
      const { data: orderItems } = await supabase.from('order_items').select('price, product:product_id (store_id)').not('product', 'is', null);
      const storeOrderItems = orderItems?.filter(item => (item.product as any)?.store_id === storeId) || [];
      const totalRevenue = storeOrderItems.reduce((sum, item) => sum + (item.price || 0), 0);
      const { count: followerCount } = await supabase.from('store_follows').select('*', { count: 'exact', head: true }).eq('store_id', storeId);
      const { data: balance } = await supabase.from('seller_balances').select('*').eq('store_id', storeId).maybeSingle();
      return {
        productCount: productCount || 0,
        orderCount: storeOrderItems.length,
        totalRevenue,
        followerCount: followerCount || 0,
        balance: balance || { available_balance: 0, pending_balance: 0, total_earned: 0, total_paid: 0 },
      };
    },
    enabled: !!storeId,
  });

  const { data: settings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('key, value').in('key', ['marketplace_default_commission_rate', 'marketplace_eclipse_commission_rate']);
      if (error) throw error;
      return data.reduce((acc, s) => ({ ...acc, [s.key]: Number(s.value) || 0 }), {} as Record<string, number>);
    },
  });

  const defaultRate = settings?.marketplace_default_commission_rate ?? 15;

  const updateRateMutation = useMutation({
    mutationFn: async ({ rate, expiresAt }: { rate: number | null; expiresAt: string | null }) => {
      const { error } = await supabase.from('stores').update({
        custom_commission_rate: rate,
        custom_rate_expires_at: expiresAt,
        custom_rate_set_by: user?.id,
        custom_rate_set_at: rate ? new Date().toISOString() : null,
      }).eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] }); toast.success('Commission rate updated'); },
    onError: (error) => { toast.error('Failed to update: ' + error.message); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase.from('stores').update({ is_active: isActive }).eq('id', storeId);
      if (error) throw error;
      try { await supabase.functions.invoke('send-admin-email', { body: { email_type: isActive ? 'store_reactivation' : 'store_deactivation', store_id: storeId } }); } catch {}
    },
    onSuccess: (_, isActive) => { queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] }); toast.success(isActive ? 'Store activated' : 'Store deactivated'); },
    onError: (error) => { toast.error('Failed to update: ' + error.message); },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('store_follows').delete().eq('store_id', storeId);
      await supabase.from('store_team_members').delete().eq('store_id', storeId);
      await supabase.from('products').update({ is_active: false }).eq('store_id', storeId);
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Store deleted'); navigate('/admin/seller-commissions'); },
    onError: (error) => { toast.error('Failed to delete: ' + error.message); },
  });

  const unlockAccountsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ accounts_locked: false, accounts_lock_reset_by: user?.id, accounts_lock_reset_at: new Date().toISOString() }).eq('user_id', store?.owner_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] }); toast.success('Account links unlocked.'); },
    onError: (error) => { toast.error('Failed to unlock: ' + error.message); },
  });

  const lockAccountsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ accounts_locked: true, accounts_locked_at: new Date().toISOString() }).eq('user_id', store?.owner_id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] }); toast.success('Account links locked.'); },
    onError: (error) => { toast.error('Failed to lock: ' + error.message); },
  });

  if (isLoading) {
    return (
      <AdminLayout requiredPermissions={['view_seller_stores']}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout requiredPermissions={['view_seller_stores']}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Store not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/seller-commissions')} className="mt-4">Back to Stores</Button>
        </div>
      </AdminLayout>
    );
  }

  const ownerProfile = store.profiles as any;
  const statItems = [
    { icon: Package, label: 'Products', value: stats?.productCount || 0 },
    { icon: TrendingUp, label: 'Orders', value: stats?.orderCount || 0 },
    { icon: DollarSign, label: 'Total Revenue', value: `£${(stats?.totalRevenue || 0).toFixed(2)}` },
    { icon: User, label: 'Followers', value: stats?.followerCount || 0 },
  ];

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate('/admin/seller-commissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{store.name}</h1>
              {store.is_verified && (
                <Badge className="gap-1 bg-blue-500 text-foreground border-0"><Shield className="h-3 w-3" />Verified Seller</Badge>
              )}
              <Badge variant={store.is_active ? 'default' : 'secondary'}>{store.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">/{store.slug}</p>
          </div>
          <Button variant="outline" onClick={() => window.open(`/store/${store.slug}`, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />View Store
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          {statItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="border border-border rounded-xl overflow-hidden min-w-[140px] flex-shrink-0 md:min-w-0">
              <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{label}</h3>
              </div>
              <div className="p-4"><p className="text-2xl font-bold">{value}</p></div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <StoreOwnerCard
            store={store}
            ownerProfile={ownerProfile}
            onUnlockAccounts={() => unlockAccountsMutation.mutate()}
            onLockAccounts={() => lockAccountsMutation.mutate()}
            isUnlocking={unlockAccountsMutation.isPending}
            isLocking={lockAccountsMutation.isPending}
          />

          <StoreCommissionCard
            store={store}
            defaultRate={defaultRate}
            isAdminManaged={isAdminManagedStore}
            onSaveRate={(rate, expiresAt) => updateRateMutation.mutate({ rate, expiresAt })}
            onResetRate={() => updateRateMutation.mutate({ rate: null, expiresAt: null })}
            isSaving={updateRateMutation.isPending}
          />

          {/* Balance */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2"><DollarSign className="h-5 w-5" />Seller Balance</h3>
            </div>
            <div className="p-4">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Available Balance</span><span className="font-medium text-green-500">£{(stats?.balance?.available_balance || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pending Balance</span><span className="font-medium text-yellow-500">£{(stats?.balance?.pending_balance || 0).toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Total Earned</span><span className="font-medium">£{(stats?.balance?.total_earned || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Paid Out</span><span className="font-medium">£{(stats?.balance?.total_paid || 0).toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* AI Branding */}
          {isAdminManagedStore && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="h-5 w-5" />AI Branding</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Generate logo and banner using AI</p>
              </div>
              <div className="p-4">
                <GenerateStoreBranding storeId={storeId!} storeName={store.name} accentColor={store.accent_color || '#8b5cf6'} currentLogoUrl={store.logo_url || undefined} currentBannerUrl={store.banner_url || undefined} />
              </div>
            </div>
          )}

          <StoreControlsCard
            store={store}
            paymentDetails={paymentDetails}
            isAdminManaged={isAdminManagedStore}
            userEmail={user?.email || ''}
            onToggleActive={(active) => toggleActiveMutation.mutate(active)}
            onDeleteStore={() => deleteStoreMutation.mutate()}
            isToggling={toggleActiveMutation.isPending}
            isDeleting={deleteStoreMutation.isPending}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
