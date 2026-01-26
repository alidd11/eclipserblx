import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Package, LogOut, Settings, Shield, Download, Loader2, Trash2, Award, MessageSquare, Copy, Check, ShoppingBag, Pencil, X, Bell, CreditCard, Sparkles, Link2, Unlink, HelpCircle, ExternalLink, Gamepad2, Crown, Users, Store, Lock, Clock } from 'lucide-react';
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
import { DiscordLinkCard } from '@/components/account/DiscordLinkCard';
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

const Account = forwardRef<HTMLDivElement>(function Account(_, ref) {
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
  
  // Roblox link state
  const [robloxInputUsername, setRobloxInputUsername] = useState('');
  const [isVerifyingRoblox, setIsVerifyingRoblox] = useState(false);
  const [isUnlinkingRoblox, setIsUnlinkingRoblox] = useState(false);
  const [robloxVerifiedData, setRobloxVerifiedData] = useState<{ id: string; name: string; displayName: string } | null>(null);
  const [robloxVerificationError, setRobloxVerificationError] = useState<string | null>(null);
  const [robloxPremiumStatus, setRobloxPremiumStatus] = useState<{ hasPremium: boolean; checked: boolean }>({ hasPremium: false, checked: false });
  const [robloxGroupInfo, setRobloxGroupInfo] = useState<{ inGroup: boolean; groupName?: string; roleName?: string; rank?: number; checked: boolean }>({ inGroup: false, checked: false });

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

  // Fetch Roblox premium status and group info when linked
  useEffect(() => {
    const fetchRobloxStatus = async () => {
      if (!profile?.roblox_user_id) {
        setRobloxPremiumStatus({ hasPremium: false, checked: false });
        setRobloxGroupInfo({ inGroup: false, checked: false });
        return;
      }

      // Fetch premium status
      try {
        const { data: premiumData } = await supabase.functions.invoke('verify-roblox-premium', {
          body: { roblox_user_id: profile.roblox_user_id },
        });
        setRobloxPremiumStatus({ hasPremium: premiumData?.hasPremium || false, checked: true });
      } catch (e) {
        console.error('Failed to check Roblox premium:', e);
        setRobloxPremiumStatus({ hasPremium: false, checked: true });
      }

      // Fetch group info (get group ID from settings)
      try {
        const { data: groupIdSetting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'roblox_group_id')
          .single();

        if (groupIdSetting?.value) {
          const { data: groupData } = await supabase.functions.invoke('verify-roblox-group', {
            body: { roblox_user_id: profile.roblox_user_id, group_id: groupIdSetting.value },
          });
          setRobloxGroupInfo({
            inGroup: groupData?.inGroup || false,
            groupName: groupData?.groupName,
            roleName: groupData?.role?.name,
            rank: groupData?.role?.rank,
            checked: true,
          });
        } else {
          setRobloxGroupInfo({ inGroup: false, checked: true });
        }
      } catch (e) {
        console.error('Failed to check Roblox group:', e);
        setRobloxGroupInfo({ inGroup: false, checked: true });
      }
    };

    fetchRobloxStatus();
  }, [profile?.roblox_user_id]);

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

  // Roblox verification functions
  const getRobloxAvatarUrl = (robloxId: string) => {
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`;
  };

  const handleVerifyRobloxUsername = async () => {
    if (!robloxInputUsername.trim()) return;
    
    setIsVerifyingRoblox(true);
    setRobloxVerificationError(null);
    setRobloxVerifiedData(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox-user', {
        body: { username: robloxInputUsername.trim() },
      });
      
      if (error) throw new Error('Failed to verify username');
      
      if (!data.found) {
        setRobloxVerificationError('Username not found on Roblox');
        return;
      }
      
      setRobloxVerifiedData({
        id: data.id,
        name: data.name,
        displayName: data.displayName,
      });
    } catch (error) {
      console.error('Roblox verification error:', error);
      setRobloxVerificationError('Failed to verify username. Please try again.');
    } finally {
      setIsVerifyingRoblox(false);
    }
  };

  const handleLinkRobloxAccount = async () => {
    if (!robloxVerifiedData || !user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          roblox_user_id: robloxVerifiedData.id,
          roblox_username: robloxVerifiedData.name,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      setRobloxInputUsername('');
      setRobloxVerifiedData(null);
    } catch (error) {
      console.error('Failed to link Roblox account:', error);
    }
  };

  const handleUnlinkRoblox = async () => {
    if (!user) return;
    setIsUnlinkingRoblox(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          roblox_user_id: null,
          roblox_username: null,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error) {
      console.error('Failed to unlink Roblox account:', error);
    } finally {
      setIsUnlinkingRoblox(false);
    }
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">My Account</h1>
          {adminLoading ? (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking access…
            </Button>
          ) : isStaff ? (
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <Shield className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          ) : null}
        </div>

        {/* Profile Details - Unified card with all identity info */}

        {/* Profile Details - Unified card with all identity info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Profile Details
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSignOutDialog(true)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign Out</TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Header - Roblox style */}
            <div className="flex items-start gap-4">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                discordAvatarUrl={discordAvatar?.avatar_url || null}
                displayName={profile?.display_name || fallbackDisplayName || ''}
                onAvatarChange={() => queryClient.invalidateQueries({ queryKey: ['profile', user.id] })}
                compact
              />
              
              <div className="flex-1 min-w-0 pt-1">
                {/* Display Name - Large and prominent */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {profile?.display_name || fallbackDisplayName || 'User'}
                  </h2>
                  {isSubscribed && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30 gap-1 text-[10px] px-2 py-0 h-5">
                      <Sparkles className="h-2.5 w-2.5" />
                      Eclipse+
                    </Badge>
                  )}
                  {profileLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                
                {/* Username - Smaller, muted */}
                <p className="text-sm text-muted-foreground">@{profile?.username || fallbackDisplayName}</p>
              </div>
            </div>

            {/* Edit Display Name Section */}
            {editingUsername ? (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Change Display Name</p>
                <div className="relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border bg-input pr-10"
                    autoFocus
                    placeholder="Enter new display name"
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
                  <p className="text-xs text-destructive">This display name is already taken</p>
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Display Name</p>
                  <p className="text-sm font-medium">{profile?.display_name || fallbackDisplayName || 'Not set'}</p>
                </div>
                {cooldownInfo.onCooldown ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 text-muted-foreground cursor-help">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {cooldownInfo.remainingDays}d
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>You can change your display name in {cooldownInfo.remainingDays} day{cooldownInfo.remainingDays !== 1 ? 's' : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={startEditingUsername}
                    className="h-8"
                  >
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                )}
              </div>
            )}

            {/* Customer ID and Member Since row */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
              {profile?.customer_id && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Customer ID</p>
                  <button
                    onClick={copyCustomerId}
                    className="flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors"
                  >
                    {profile.customer_id}
                    {copiedId ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                <p className="text-sm font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            
            {/* Discord Section - Using OAuth Component */}
            <DiscordLinkCard
              userId={user.id}
              currentDiscordId={profile?.discord_id || null}
              currentDiscordUsername={profile?.discord_username || null}
              hasEclipsePlus={isSubscribed}
              accountsLocked={(profile as any)?.accounts_locked}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
                queryClient.invalidateQueries({ queryKey: ['discord-avatar'] });
              }}
            />
            
            {/* Roblox Section */}
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground">Roblox Account</p>
              </div>
              
              {profile?.roblox_user_id && profile?.roblox_username ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={getRobloxAvatarUrl(profile.roblox_user_id)} 
                        alt={profile.roblox_username} 
                      />
                      <AvatarFallback className="bg-emerald-500/20">
                        <Gamepad2 className="h-3.5 w-3.5 text-emerald-500" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">{profile.roblox_username}</p>
                        {robloxPremiumStatus.checked && robloxPremiumStatus.hasPremium && (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[9px] px-1.5 py-0 h-4">
                            <Crown className="w-2 h-2 mr-0.5" />
                            Premium
                          </Badge>
                        )}
                        {robloxGroupInfo.checked && robloxGroupInfo.inGroup && (
                          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-[9px] px-1.5 py-0 h-4">
                            <Users className="w-2 h-2 mr-0.5" />
                            {robloxGroupInfo.roleName || 'Member'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        ID: {profile.roblox_user_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <a
                        href={`https://www.roblox.com/users/${profile.roblox_user_id}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleUnlinkRoblox}
                      disabled={isUnlinkingRoblox || (profile as any)?.accounts_locked}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      {isUnlinkingRoblox ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (profile as any)?.accounts_locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Roblox username"
                      value={robloxInputUsername}
                      onChange={(e) => {
                        setRobloxInputUsername(e.target.value);
                        setRobloxVerificationError(null);
                        setRobloxVerifiedData(null);
                      }}
                      className="flex-1 h-8 text-xs"
                    />
                    <Button
                      onClick={handleVerifyRobloxUsername}
                      disabled={!robloxInputUsername.trim() || isVerifyingRoblox}
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                    >
                      {isVerifyingRoblox ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                  
                  {robloxVerificationError && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <X className="h-3 w-3" />
                      {robloxVerificationError}
                    </div>
                  )}
                  
                  {robloxVerifiedData && (
                    <div className="flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={getRobloxAvatarUrl(robloxVerifiedData.id)} 
                            alt={robloxVerifiedData.displayName} 
                          />
                          <AvatarFallback className="bg-emerald-500/20">
                            <Gamepad2 className="h-3.5 w-3.5 text-emerald-500" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-green-500" />
                            <p className="font-medium text-xs">{robloxVerifiedData.displayName}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            @{robloxVerifiedData.name}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={handleLinkRobloxAccount} className="h-7 text-xs">
                        Link
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Eclipse+ Subscription Card */}
        <SubscriptionCard />

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <Link
            to="/downloads"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <Download className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Downloads</span>
          </Link>
          <Link
            to="/products"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <Package className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Products</span>
          </Link>
          <Link
            to="/chat-history"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Support</span>
          </Link>
          <Link
            to="/notifications"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <Bell className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Alerts</span>
          </Link>
          <button
            onClick={() => handleTabChange('shopping')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Orders</span>
          </button>
          <button
            onClick={() => handleTabChange('preferences')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors text-center"
          >
            <Settings className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>

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
          <TabsContent value="profile">
            {/* Badges - Full Width */}
            <Card className="bg-card border-border mb-6">
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

            {/* Grid for other cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Marketplace Beta - Only visible to users with feature flag access */}
              {hasMarketplaceAccess && <BecomeSellerCard />}

              {/* Referral Card */}
              <ReferralCard />

              {/* Affiliate Earnings Card */}
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
