import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Package, LogOut, Settings, Shield, Download, Loader2, Trash2, Award, MessageSquare, Copy, Check, ShoppingBag, Pencil, X, Bell, CreditCard, Sparkles, HelpCircle, Store, Clock, ShoppingCart } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBadges } from '@/hooks/useBadges';
import { useSubscription } from '@/hooks/useSubscription';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUSES } from '@/lib/constants';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { DeleteProfileDialog } from '@/components/auth/DeleteProfileDialog';
import { BadgeShowcase } from '@/components/badges/BadgeShowcase';

import { AvatarUpload } from '@/components/account/AvatarUpload';
import { LinkedAccountsCard } from '@/components/account/LinkedAccountsCard';
import { EmailSubscriptionCard } from '@/components/account/EmailSubscriptionCard';
import { ReferralCard } from '@/components/account/ReferralCard';
import { AffiliateCard } from '@/components/account/AffiliateCard';
import { NotificationSettingsCard } from '@/components/account/NotificationSettingsCard';
import { SoundCustomizationCard } from '@/components/account/SoundCustomizationCard';
import { ThemeSettingsCard } from '@/components/account/ThemeSettingsCard';
import { MyMessagesCard } from '@/components/account/MyMessagesCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MyPurchasesCard } from '@/components/account/MyPurchasesCard';
import { SavedCardsCard } from '@/components/account/SavedCardsCard';
import { BecomeSellerCard } from '@/components/account/BecomeSellerCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { usePageTracking } from '@/hooks/usePageTracking';

// Unified IDs display component
const UserIdsSection = ({ userId, customerId, onCopyCustomerId, copiedId }: { 
  userId: string; 
  customerId: string | null;
  onCopyCustomerId: () => void;
  copiedId: boolean;
}) => {
  const { data: affiliateApp } = useQuery({
    queryKey: ['affiliate-id', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_applications')
        .select('affiliate_id')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });

  const { data: store } = useQuery({
    queryKey: ['seller-id', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('store_id')
        .eq('owner_id', userId)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  });

  const hasAnyId = customerId || affiliateApp?.affiliate_id || store?.store_id;
  if (!hasAnyId) return null;

  const idItems = [
    customerId && { label: 'Customer ID', value: customerId, copyable: true },
    affiliateApp?.affiliate_id && { label: 'Affiliate ID', value: affiliateApp.affiliate_id, copyable: false },
    store?.store_id && { label: 'Seller ID', value: store.store_id, copyable: false },
  ].filter(Boolean) as { label: string; value: string; copyable: boolean }[];

  return (
    <div className="border-t border-border px-4 sm:px-6 py-2.5">
      <div className="flex items-center gap-3 overflow-x-auto flex-nowrap">
        {idItems.map((item, idx) => (
          <div key={item.label} className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              {item.label.replace(' ID', '')}:
            </span>
            {item.copyable ? (
              <button
                onClick={onCopyCustomerId}
                className="inline-flex items-center gap-1.5 text-sm font-mono text-foreground/80 hover:text-foreground transition-colors"
              >
                <span>{item.value}</span>
                {copiedId ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="text-sm font-mono text-foreground/80">{item.value}</span>
            )}
            {idx < idItems.length - 1 && (
              <span className="text-muted-foreground/30">•</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const Account = forwardRef<HTMLDivElement>(function Account(_, ref) {
  usePageTracking({ pagePath: '/account' });
  const { user, signOut, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { badges, userBadges } = useBadges();
  const { isSubscribed } = useSubscription();
  const { hasAccess: hasMarketplaceAccess } = useMarketplaceAccess();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  

  // Get initial tab from URL hash
  const getInitialTab = () => {
    const hash = location.hash.replace('#', '');
    if (['profile', 'shopping', 'following', 'preferences', 'security'].includes(hash)) {
      return hash;
    }
    return 'profile';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab with URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (['profile', 'shopping', 'preferences', 'security'].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.history.replaceState(null, '', `#${value}`);
  };

  const copyCustomerId = async () => {
    if (profile?.customer_id) {
      await navigator.clipboard.writeText(profile.customer_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };


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
        } catch {
          // Ignore if already exists
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
        .select('user_id, email, display_name, username, avatar_url, customer_id, discord_id, discord_username, roblox_user_id, roblox_username, created_at, updated_at, accounts_locked, display_name_changed_at')
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

  // Fetch Discord avatar when user has a linked Discord account
  const { data: discordAvatar } = useQuery({
    queryKey: ['discord-avatar', profile?.discord_id],
    queryFn: async () => {
      if (!profile?.discord_id) return null;
      const { data, error } = await supabase.functions.invoke('get-discord-avatar', {
        body: { discord_id: profile.discord_id },
      });
      if (error) {
        console.error('Failed to fetch Discord avatar:', error);
        return null;
      }
      return data;
    },
    enabled: !!profile?.discord_id,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });


  // Ensure a profile row exists (some older accounts may not have one).
  useEffect(() => {
    if (!user?.id || !user.email) return;
    if (profileLoading) return;
    if (profile) return;

    const run = async () => {
      const usernameValue = fallbackDisplayName || user.email?.split('@')[0] || 'user';
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        display_name: fallbackDisplayName || null,
        username: usernameValue,
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

  // Calculate cooldown for display name changes (30 days)
  const displayNameCooldownDays = 30;
  const displayNameCooldownMs = displayNameCooldownDays * 24 * 60 * 60 * 1000;
  
  const getDisplayNameCooldownInfo = () => {
    if (!profile?.display_name_changed_at) return { onCooldown: false, remainingDays: 0 };
    const lastChanged = new Date(profile.display_name_changed_at).getTime();
    const cooldownEnds = lastChanged + displayNameCooldownMs;
    const now = Date.now();
    if (now >= cooldownEnds) return { onCooldown: false, remainingDays: 0 };
    const remainingMs = cooldownEnds - now;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return { onCooldown: true, remainingDays };
  };
  
  const cooldownInfo = getDisplayNameCooldownInfo();

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!user || !trimmed || trimmed.length < 6 || trimmed.length > 20 || usernameAvailable === false) return;
    
    // Check cooldown
    if (cooldownInfo.onCooldown) {
      return;
    }
    
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: newUsername.trim(),
          display_name_changed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setEditingUsername(false);
      setNewUsername('');
    } catch (error) {
      console.error('Failed to update display name:', error);
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
      <div className="container py-8 space-y-6 max-w-4xl ml-auto mr-4 sm:mr-8 lg:mr-auto">
        {/* My Profile Card */}
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            {/* Profile Header */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0 w-full">
                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url || null}
                  discordAvatarUrl={discordAvatar?.avatar_url || null}
                  displayName={profile?.display_name || fallbackDisplayName || ''}
                  onAvatarChange={() => queryClient.invalidateQueries({ queryKey: ['profile', user.id] })}
                  compact
                />
                
                <div className="flex-1 min-w-0">
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="px-2 py-1 text-xl sm:text-2xl font-bold tracking-tight rounded-md border bg-input w-full pr-8"
                        autoFocus
                        placeholder="Display name"
                      />
                      {newUsername.trim().length >= 2 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={handleSaveUsername}
                      disabled={savingUsername || !newUsername.trim() || usernameAvailable === false || newUsername.trim().length < 2}
                    >
                      {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => { setEditingUsername(false); setNewUsername(''); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <h1 className="min-w-0 flex-1 text-xl sm:text-2xl font-bold tracking-tight truncate">
                      {profile?.display_name || fallbackDisplayName || 'User'}
                    </h1>
                    {!cooldownInfo.onCooldown ? (
                      <button
                        onClick={startEditingUsername}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground/60 p-1 cursor-help shrink-0">
                              <Clock className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>You can change your name in {cooldownInfo.remainingDays}d</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm text-muted-foreground">@{profile?.username || fallbackDisplayName}</p>
                  <span className="text-muted-foreground/40">•</span>
                  <p className="text-xs text-muted-foreground">
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              </div>

              <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                {adminLoading ? (
                  <Button variant="ghost" size="icon" disabled className="h-9 w-9">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                ) : isStaff ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-9 w-9">
                        <Shield className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Admin Dashboard</TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSignOutDialog(true)}
                      className="text-muted-foreground hover:text-destructive h-9 w-9"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign Out</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* IDs Section */}
            <UserIdsSection 
              userId={user.id} 
              customerId={profile?.customer_id || null}
              onCopyCustomerId={copyCustomerId}
              copiedId={copiedId}
            />

            {/* Badges Row (earned + status like Eclipse+) */}
            {(isSubscribed || (userBadges && userBadges.length > 0)) && (
              <div className="border-t border-border px-4 sm:px-6 py-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Badges</span>
                    {isSubscribed && (
                      <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                        <Sparkles className="h-2.5 w-2.5" />
                        Eclipse+
                      </Badge>
                    )}
                  </div>

                  <BadgeShowcase badges={badges} userBadges={userBadges} />
                </div>
              </div>
            )}

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
              <Link
                to="/purchases"
                className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors"
              >
                <Download className="h-4 w-4 text-primary mb-1" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Purchases</span>
              </Link>
              <Link
                to="/credits"
                className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-primary mb-1" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Wallet</span>
              </Link>
              <Link
                to="/chat-history"
                className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary mb-1" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Support</span>
              </Link>
              <Link
                to="/notifications"
                className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors"
              >
                <Bell className="h-4 w-4 text-primary mb-1" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Alerts</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Eclipse+ Subscription Card */}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1">
            <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="shopping" className="flex items-center gap-2 py-2.5">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Shopping</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 py-2.5">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">

            {/* Linked Accounts */}
            <LinkedAccountsCard
              userId={user.id}
              discordId={profile?.discord_id || null}
              discordUsername={profile?.discord_username || null}
              robloxUserId={profile?.roblox_user_id || null}
              robloxUsername={profile?.roblox_username || null}
              hasEclipsePlus={isSubscribed}
              accountsLocked={(profile as any)?.accounts_locked}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
                queryClient.invalidateQueries({ queryKey: ['discord-avatar'] });
              }}
            />


            {/* Eclipse+ Subscription */}
            <SubscriptionCard />

            {/* Badges */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4" />
                  My Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BadgeShowcase badges={badges} userBadges={userBadges} showAll />
              </CardContent>
            </Card>

            {/* Grid for referral/affiliate cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hasMarketplaceAccess && <BecomeSellerCard />}
              <ReferralCard />
              <AffiliateCard />
            </div>
          </TabsContent>

          {/* Shopping Tab */}
          <TabsContent value="shopping" className="space-y-6">
            {/* My Purchases */}
            <MyPurchasesCard />

            {/* Order History */}
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
                                    <Link to="/purchases">
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
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <ThemeSettingsCard />

              {/* Email Subscriptions */}
              <EmailSubscriptionCard />

              {/* Notification Settings */}
              <NotificationSettingsCard />

              {/* Sound Customization */}
              <SoundCustomizationCard />
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Messages */}
              <MyMessagesCard />

              {/* Saved Payment Methods */}
              <SavedCardsCard />
            </div>
          </TabsContent>
        </Tabs>

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

      </div>
    </MainLayout>
  );
});

export default Account;
