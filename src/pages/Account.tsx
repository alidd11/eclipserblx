import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Package, LogOut, Settings, Shield, Download, Loader2, Trash2, Award, MessageSquare, Copy, Check, ShoppingBag, Pencil, X, Bell } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBadges } from '@/hooks/useBadges';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUSES } from '@/lib/constants';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { DeleteProfileDialog } from '@/components/auth/DeleteProfileDialog';
import { BadgeShowcase } from '@/components/badges/BadgeShowcase';
import { NewBadgeToast } from '@/components/badges/NewBadgeToast';
import { AvatarUpload } from '@/components/account/AvatarUpload';
import { EmailSubscriptionCard } from '@/components/account/EmailSubscriptionCard';
import { ReferralCard } from '@/components/account/ReferralCard';
import { NotificationSettingsCard } from '@/components/account/NotificationSettingsCard';
import { SoundCustomizationCard } from '@/components/account/SoundCustomizationCard';
import { MyMessagesCard } from '@/components/account/MyMessagesCard';
const Account = forwardRef<HTMLDivElement>(function Account(_, ref) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { badges, userBadges, newBadges, checkBadges, clearNewBadges } = useBadges();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const copyCustomerId = async () => {
    if (profile?.customer_id) {
      await navigator.clipboard.writeText(profile.customer_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Check for new badges when account page loads
  useEffect(() => {
    if (user) {
      checkBadges();
    }
  }, [user, checkBadges]);

  // Handle pending email subscription from signup
  useEffect(() => {
    const handlePendingSubscription = async () => {
      const pending = sessionStorage.getItem('pendingEmailSubscription');
      if (pending && user?.id && user?.email) {
        sessionStorage.removeItem('pendingEmailSubscription');
        try {
          await supabase.from('email_subscriptions').insert({
            user_id: user.id,
            email: user.email,
            subscribed_to_updates: true,
            subscribed_to_discounts: true,
            subscribed_to_newsletters: true,
          });
        } catch (error) {
          // Ignore if already exists
          console.log('Email subscription creation:', error);
        }
      }
    };
    handlePendingSubscription();
  }, [user?.id, user?.email]);

  const fallbackDisplayName = useMemo(() => {
    if (!user) return '';
    const metaName = (user.user_metadata as any)?.display_name;
    if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
    return 'User';
  }, [user]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, avatar_url, customer_id, created_at, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Ensure a profile row exists (some older accounts may not have one).
  useEffect(() => {
    if (!user?.id || !user.email) return;
    if (profileLoading) return;
    if (profile) return;

    const run = async () => {
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        display_name: fallbackDisplayName || null,
      });

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    };

    // Fire-and-forget; if RLS blocks this insert, we simply keep using the fallback name.
    void run();
  }, [user?.id, user?.email, profileLoading, profile, fallbackDisplayName, queryClient]);

  // Real-time username availability check
  useEffect(() => {
    const trimmed = newUsername.trim();
    if (!editingUsername || !trimmed || trimmed.length < 6 || trimmed.length > 20) {
      setUsernameAvailable(null);
      return;
    }

    // If same as current, mark as available
    if (newUsername.trim().toLowerCase() === profile?.display_name?.toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data: isAvailable } = await supabase.rpc('is_username_available', {
          username: newUsername.trim()
        });
        setUsernameAvailable(isAvailable ?? false);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [newUsername, editingUsername, profile?.display_name]);

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!user || !trimmed || trimmed.length < 6 || trimmed.length > 20 || usernameAvailable === false) return;
    
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newUsername.trim() })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setEditingUsername(false);
      setNewUsername('');
    } catch (error) {
      console.error('Failed to update username:', error);
    } finally {
      setSavingUsername(false);
    }
  };

  const startEditingUsername = () => {
    setNewUsername(profile?.display_name || fallbackDisplayName || '');
    setEditingUsername(true);
    setUsernameAvailable(null);
  };

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      
      // Query by user_id first
      let { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            price,
            product_id,
            product:products (
              id,
              name,
              images,
              asset_file_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Also query by email to catch orders where user_id wasn't set
      if (user?.email) {
        const { data: emailOrders, error: emailError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              id,
              product_name,
              price,
              product_id,
              product:products (
                id,
                name,
                images,
                asset_file_url
              )
            )
          `)
          .eq('customer_email', user.email)
          .is('user_id', null)
          .order('created_at', { ascending: false });
        
        if (!emailError && emailOrders) {
          // Merge and deduplicate
          const allOrders = [...(data || []), ...emailOrders];
          const uniqueOrders = allOrders.filter((order, index, self) =>
            index === self.findIndex((o) => o.id === order.id)
          );
          return uniqueOrders;
        }
      }
      
      return data || [];
    },
    enabled: !!(user?.id || user?.email),
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-4">
          <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
          <p className="text-muted-foreground">You need to be signed in to view your account.</p>
          <Button asChild className="gradient-button border-0">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const config = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
    const colorMap: Record<string, string> = {
      success: 'bg-green-500/10 text-green-500 border-green-500/30',
      warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      destructive: 'bg-red-500/10 text-red-500 border-red-500/30',
      primary: 'bg-primary/10 text-primary border-primary/30',
      muted: 'bg-muted text-muted-foreground',
    };
    return (
      <Badge variant="outline" className={colorMap[config?.color] || colorMap.muted}>
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <MainLayout ref={ref}>
      <div className="container py-8 space-y-8 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">My Account</h1>
          {adminLoading ? (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking access…
            </Button>
          ) : isStaff ? (
            <Button variant="outline" onClick={() => window.open('/admin', '_blank')}>
              <Shield className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          ) : null}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                displayName={profile?.display_name || fallbackDisplayName || ''}
                onAvatarChange={() => queryClient.invalidateQueries({ queryKey: ['profile', user.id] })}
              />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Username</p>
                {editingUsername ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-md border bg-input pr-10"
                        autoFocus
                      />
                      {newUsername.trim().length >= 2 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {checkingUsername ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : usernameAvailable === true ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : usernameAvailable === false ? (
                            <X className="h-4 w-4 text-destructive" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    {usernameAvailable === false && newUsername.trim().length >= 2 && (
                      <p className="text-xs text-destructive">This username is already taken</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveUsername}
                        disabled={savingUsername || !newUsername.trim() || usernameAvailable === false || newUsername.trim().length < 2}
                      >
                        {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingUsername(false); setNewUsername(''); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {profile?.display_name || fallbackDisplayName || 'Not set'}
                      {profileLoading && (
                        <span className="ml-2 inline-flex items-center text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading
                        </span>
                      )}
                    </p>
                    <button
                      onClick={startEditingUsername}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit username"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              {profile?.customer_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer ID</p>
                  <button
                    onClick={copyCustomerId}
                    className="flex items-center gap-2 font-mono font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {profile.customer_id}
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <Link
                  to="/downloads"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                >
                  <Download className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">My Downloads</span>
                </Link>
                <Link
                  to="/products"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                >
                  <Package className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Browse Products</span>
                </Link>
                <Link
                  to="/chat-history"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                >
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Support History</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                >
                  <Bell className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Notifications</span>
                </Link>
                <Link
                  to="/downloads"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                >
                  <ShoppingBag className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">View Orders</span>
                </Link>
                <button
                  onClick={() => setShowSignOutDialog(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-destructive/10 transition-colors text-center"
                >
                  <LogOut className="h-6 w-6 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Sign Out</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Card */}
        <ReferralCard />

        {/* Email Subscriptions */}
        <EmailSubscriptionCard />

        {/* Notification Settings */}
        <NotificationSettingsCard />

        {/* Sound Customization */}
        <SoundCustomizationCard />

        {/* My Messages */}
        <MyMessagesCard />

        {/* Badges */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              My Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BadgeShowcase badges={badges} userBadges={userBadges} showAll />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading orders...</p>
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't made any orders yet.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 rounded-lg bg-muted/50 space-y-4">
                    {/* Order Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg">£{Number(order.total).toFixed(2)}</p>
                        {order.discount_amount > 0 && (
                          <p className="text-xs text-primary">
                            Saved £{Number(order.discount_amount).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="border-t border-border pt-3 space-y-2">
                      {order.order_items?.map((item: any) => {
                        const hasAsset = !!item.product?.asset_file_url;
                        const isPaid = order.status === 'paid' || order.status === 'completed';
                        
                        return (
                          <div 
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/70 transition-colors"
                          >
                            {/* Product Image */}
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                              {item.product?.images?.[0] ? (
                                <img 
                                  src={item.product.images[0]} 
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">£{Number(item.price).toFixed(2)}</p>
                            </div>
                            
                            {/* Download Button */}
                            {isPaid && hasAsset && (
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="shrink-0"
                              >
                                <Link to="/downloads">
                                  <Download className="h-3.5 w-3.5 mr-1.5" />
                                  Download
                                </Link>
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Payment Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <span>
                        Payment: {order.payment_method ? order.payment_method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'Card'}
                      </span>
                      <span>{order.order_items?.length || 0} item(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-card border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data including downloads.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out Confirmation Dialog */}
        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={handleSignOut}
          isLoading={isSigningOut}
        />

        {/* Delete Profile Dialog */}
        <DeleteProfileDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          userEmail={user.email || ''}
          onDeleted={() => navigate('/')}
        />

        {/* New Badge Toast Notifications */}
        <NewBadgeToast badges={newBadges} onClear={clearNewBadges} />
      </div>
    </MainLayout>
  );
});

export default Account;
