import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Store, User, Calendar, Percent, Shield, Power, Trash2, ExternalLink, Package, TrendingUp, DollarSign, Mail, MessageCircle, Gamepad2, Lock, Unlock, Link2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { GenerateStoreBranding } from '@/components/admin/GenerateStoreBranding';
import { ADMIN_MANAGED_STORES } from '@/lib/constants';

export default function SellerStoreDetail() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [customRate, setCustomRate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch store details with owner info
  const { data: store, isLoading } = useQuery({
    queryKey: ['seller-store-detail', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          profiles:owner_id (
            display_name,
            username,
            email,
            avatar_url,
            discord_id,
            discord_username,
            roblox_user_id,
            roblox_username,
            customer_id,
            accounts_locked,
            accounts_locked_at
          )
        `)
        .eq('id', storeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  // Fetch store statistics
  const { data: stats } = useQuery({
    queryKey: ['seller-store-stats', storeId],
    queryFn: async () => {
      // Get product count
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      // Get order count and revenue
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          price,
          product:product_id (store_id)
        `)
        .not('product', 'is', null);

      const storeOrderItems = orderItems?.filter(item => (item.product as any)?.store_id === storeId) || [];
      const totalRevenue = storeOrderItems.reduce((sum, item) => sum + (item.price || 0), 0);

      // Get follower count
      const { count: followerCount } = await supabase
        .from('store_follows')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      // Get seller balance
      const { data: balance } = await supabase
        .from('seller_balances')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();

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

  // Fetch default commission rate
  const { data: settings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['marketplace_default_commission_rate', 'marketplace_eclipse_commission_rate']);
      
      if (error) throw error;
      return data.reduce((acc, s) => ({ ...acc, [s.key]: Number(s.value) || 0 }), {} as Record<string, number>);
    },
  });

  const defaultRate = settings?.marketplace_default_commission_rate ?? 15;

  // Update custom rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async ({ rate, expiresAt }: { rate: number | null; expiresAt: string | null }) => {
      const { error } = await supabase
        .from('stores')
        .update({
          custom_commission_rate: rate,
          custom_rate_expires_at: expiresAt,
          custom_rate_set_by: user?.id,
          custom_rate_set_at: rate ? new Date().toISOString() : null,
        })
        .eq('id', storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success('Commission rate updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Toggle trusted mutation
  const toggleTrustedMutation = useMutation({
    mutationFn: async (isTrusted: boolean) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_trusted: isTrusted })
        .eq('id', storeId);
      
      if (error) throw error;
    },
    onSuccess: (_, isTrusted) => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success(isTrusted ? 'Trusted Seller badge granted' : 'Trusted Seller badge removed');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: isActive })
        .eq('id', storeId);
      
      if (error) throw error;

      // Send email notification
      const functionName = isActive ? 'send-store-reactivation-email' : 'send-store-deactivation-email';
      try {
        await supabase.functions.invoke(functionName, { body: { store_id: storeId } });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success(isActive ? 'Store activated' : 'Store deactivated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  // Delete store mutation
  const deleteStoreMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('store_follows').delete().eq('store_id', storeId);
      await supabase.from('store_team_members').delete().eq('store_id', storeId);
      await supabase.from('products').update({ is_active: false }).eq('store_id', storeId);
      
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store deleted');
      navigate('/admin/seller-commissions');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  // Unlock accounts mutation
  const unlockAccountsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          accounts_locked: false,
          accounts_lock_reset_by: user?.id,
          accounts_lock_reset_at: new Date().toISOString(),
        })
        .eq('user_id', store?.owner_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success('Account links unlocked. User can now update their linked accounts.');
    },
    onError: (error) => {
      toast.error('Failed to unlock: ' + error.message);
    },
  });

  // Lock accounts mutation
  const lockAccountsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          accounts_locked: true,
          accounts_locked_at: new Date().toISOString(),
        })
        .eq('user_id', store?.owner_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-store-detail', storeId] });
      toast.success('Account links locked.');
    },
    onError: (error) => {
      toast.error('Failed to lock: ' + error.message);
    },
  });

  const handleSaveRate = () => {
    const rate = customRate ? parseFloat(customRate) : null;
    if (rate !== null && (rate < 0 || rate > 100)) {
      toast.error('Rate must be between 0 and 100');
      return;
    }
    const expiresAt = expirationDate ? new Date(expirationDate).toISOString() : null;
    updateRateMutation.mutate({ rate, expiresAt });
  };

  const handleResetRate = () => {
    updateRateMutation.mutate({ rate: null, expiresAt: null });
    setCustomRate('');
    setExpirationDate('');
  };

  const getEffectiveRate = () => {
    if (!store) return defaultRate;
    // Admin-managed stores (Eclipse, Vino) have 0% commission
    if (ADMIN_MANAGED_STORES.includes(storeId as any)) {
      return 0;
    }
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) {
      return store.commission_rate ?? defaultRate;
    }
    return store.custom_commission_rate ?? store.commission_rate ?? defaultRate;
  };

  const isCustomRateActive = () => {
    if (!store?.custom_commission_rate) return false;
    if (store.custom_rate_expires_at && new Date(store.custom_rate_expires_at) <= new Date()) {
      return false;
    }
    return true;
  };

  // Initialize form when store loads
  if (store && !customRate && store.custom_commission_rate) {
    setCustomRate(store.custom_commission_rate.toString());
    if (store.custom_rate_expires_at) {
      setExpirationDate(store.custom_rate_expires_at.split('T')[0]);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout requiredPermissions={['view_seller_stores']}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!store) {
    return (
      <AdminLayout requiredPermissions={['view_seller_stores']}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Store not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/seller-commissions')} className="mt-4">
            Back to Stores
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const ownerProfile = store.profiles as any;

  return (
    <AdminLayout requiredPermissions={['view_seller_stores']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seller-commissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{store.name}</h1>
              {store.is_trusted && (
                <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                  <Shield className="h-3 w-3" />
                  Trusted Seller
                </Badge>
              )}
              <Badge variant={store.is_active ? 'default' : 'secondary'}>
                {store.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">/{store.slug}</p>
          </div>
          <Button variant="outline" onClick={() => window.open(`/store/${store.slug}`, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Store
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.productCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.orderCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${(stats?.totalRevenue || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 md:min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Followers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.followerCount || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Owner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Store Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {ownerProfile?.avatar_url ? (
                  <img src={ownerProfile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{ownerProfile?.display_name || 'Unknown User'}</p>
                  {ownerProfile?.username && (
                    <p className="text-xs text-muted-foreground">@{ownerProfile.username}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{ownerProfile?.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-3 text-sm">
                {ownerProfile?.customer_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer ID</span>
                    <span className="font-mono">{ownerProfile.customer_id}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Linked Accounts */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Accounts</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      Discord
                    </span>
                    {ownerProfile?.discord_username ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/30">
                          {ownerProfile.discord_username}
                        </Badge>
                        {ownerProfile.discord_id && (
                          <span className="text-xs text-muted-foreground font-mono">{ownerProfile.discord_id}</span>
                        )}
                      </span>
                    ) : (
                      <Badge variant="destructive">Not Linked</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Gamepad2 className="h-4 w-4" />
                      Roblox
                    </span>
                    {ownerProfile?.roblox_username ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                          {ownerProfile.roblox_username}
                        </Badge>
                        {ownerProfile.roblox_user_id && (
                          <span className="text-xs text-muted-foreground font-mono">{ownerProfile.roblox_user_id}</span>
                        )}
                      </span>
                    ) : (
                      <Badge variant="destructive">Not Linked</Badge>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Account Lock Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {ownerProfile?.accounts_locked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      Account Links
                    </span>
                    {ownerProfile?.accounts_locked ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Locked</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unlockAccountsMutation.mutate()}
                          disabled={unlockAccountsMutation.isPending}
                        >
                          <Unlock className="h-3 w-3 mr-1" />
                          Unlock
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Unlocked</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => lockAccountsMutation.mutate()}
                          disabled={lockAccountsMutation.isPending}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Lock
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ownerProfile?.accounts_locked 
                      ? 'User cannot change their linked Discord/Roblox accounts.'
                      : 'User can currently modify their linked accounts. Lock to prevent changes.'}
                  </p>
                </div>
                
                <Separator />

                {/* Discord Server Invite */}
                {(store as any).discord_invite && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Link2 className="h-4 w-4" />
                      Discord Server
                    </span>
                    <a
                      href={(store as any).discord_invite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Join Server
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Store Created</span>
                  <span>{format(parseISO(store.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission Settings - Hidden for admin-managed stores */}
          {!ADMIN_MANAGED_STORES.includes(storeId as any) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Commission Settings
                </CardTitle>
                <CardDescription>
                  Current effective rate: <Badge>{getEffectiveRate()}%</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Custom Commission Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder={`Default: ${defaultRate}%`}
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Rate Expiration Date (Optional)</Label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                    />
                    {store.custom_rate_expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Current expiration: {format(parseISO(store.custom_rate_expires_at), 'MMM d, yyyy')}
                        {new Date(store.custom_rate_expires_at) <= new Date() && (
                          <Badge variant="destructive" className="ml-2 text-xs">Expired</Badge>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveRate} disabled={updateRateMutation.isPending}>
                    Save Rate
                  </Button>
                  {isCustomRateActive() && (
                    <Button variant="outline" onClick={handleResetRate} disabled={updateRateMutation.isPending}>
                      Reset to Default
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Commission Settings
                </CardTitle>
                <CardDescription>
                  Current effective rate: <Badge>0%</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is a platform-managed store with a fixed 0% commission rate. Commission settings cannot be modified.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Balance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Seller Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-medium text-green-500">${(stats?.balance?.available_balance || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Balance</span>
                  <span className="font-medium text-yellow-500">${(stats?.balance?.pending_balance || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Earned</span>
                  <span className="font-medium">${(stats?.balance?.total_earned || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Paid Out</span>
                  <span className="font-medium">${(stats?.balance?.total_paid || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Branding Generation - Only for admin-managed stores */}
          {ADMIN_MANAGED_STORES.includes(storeId as any) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Branding
                </CardTitle>
                <CardDescription>
                  Generate logo and banner using AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GenerateStoreBranding
                  storeId={storeId!}
                  storeName={store.name}
                  accentColor={store.accent_color || '#8b5cf6'}
                  currentLogoUrl={store.logo_url || undefined}
                  currentBannerUrl={store.banner_url || undefined}
                />
              </CardContent>
            </Card>
          )}

          {/* Store Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Active Status</p>
                  <p className="text-sm text-muted-foreground">Enable or disable the store</p>
                </div>
                <Switch
                  checked={store.is_active}
                  onCheckedChange={(checked) => toggleActiveMutation.mutate(checked)}
                  disabled={toggleActiveMutation.isPending}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Trusted Seller</p>
                  <p className="text-sm text-muted-foreground">Grant the trusted seller badge</p>
                </div>
                <Switch
                  checked={store.is_trusted}
                  onCheckedChange={(checked) => toggleTrustedMutation.mutate(checked)}
                  disabled={toggleTrustedMutation.isPending || !store.is_active}
                />
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Store
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will deactivate all products and remove the store. Order history will be preserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Store?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{store.name}" and deactivate all its products. 
                Order history will be preserved. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStoreMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Store
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
