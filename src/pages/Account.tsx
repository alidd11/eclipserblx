import React, { forwardRef, useEffect, useMemo, useState, useContext, createContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, LogOut, Loader2, Pencil, X, Check, Clock,
  Download, CreditCard, MessageSquare, Bell, Package,
  ChevronRight, Link2, Palette, Mail, Volume2, Store,
  Award, ShoppingBag, Gift, Sparkles, Trash2, Shield,
  Copy, Hash, Heart,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useBadges } from '@/hooks/useBadges';

import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { supabase } from '@/integrations/supabase/client';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { DeleteProfileDialog } from '@/components/auth/DeleteProfileDialog';
import { AvatarUpload } from '@/components/account/AvatarUpload';
import { LinkedAccountsCard } from '@/components/account/LinkedAccountsCard';
import { EmailSubscriptionCard } from '@/components/account/EmailSubscriptionCard';
import { ReferralCard } from '@/components/account/ReferralCard';
import { AffiliateCard } from '@/components/account/AffiliateCard';
import { NotificationSettingsCard } from '@/components/account/NotificationSettingsCard';
import { SoundCustomizationCard } from '@/components/account/SoundCustomizationCard';

import { MyPurchasesCard } from '@/components/account/MyPurchasesCard';
import { SavedCardsCard } from '@/components/account/SavedCardsCard';
import { BecomeSellerCard } from '@/components/account/BecomeSellerCard';
import { CreditsCard } from '@/components/account/CreditsCard';
import { DataExportButton } from '@/components/account/DataExportButton';

import { usePageTracking } from '@/hooks/usePageTracking';

/* ─────────── Navigation Row ─────────── */
function NavRow({ icon: Icon, label, to, badge, destructive }: {
  icon: React.ElementType;
  label: string;
  to?: string;
  badge?: string | number;
  destructive?: boolean;
}) {
  const content = (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
      destructive
        ? 'hover:bg-destructive/10 text-destructive'
        : 'hover:bg-muted/60'
    }`}>
      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
        destructive ? 'bg-destructive/10' : 'bg-primary/10'
      }`}>
        <Icon className={`h-4 w-4 ${destructive ? 'text-destructive' : 'text-primary'}`} />
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge != null && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
          {badge}
        </span>
      )}
      {to && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }
  return content;
}

/* ─────────── Section Header ─────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-5 pb-1.5">
      {title}
    </p>
  );
}

/* ─────────── Accordion Group Context ─────────── */
const AccordionGroupContext = createContext<{
  openId: string | null;
  setOpenId: (id: string | null) => void;
} | null>(null);

function AccordionGroup({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <AccordionGroupContext.Provider value={{ openId, setOpenId }}>
      {children}
    </AccordionGroupContext.Provider>
  );
}

/* ─────────── Expandable Section ─────────── */
function ExpandableSection({ icon: Icon, label, children, defaultOpen }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const group = useContext(AccordionGroupContext);
  const id = label; // Use label as unique ID within group
  const isControlled = !!group;
  const [localOpen, setLocalOpen] = useState(defaultOpen ?? false);

  const open = isControlled ? group.openId === id : localOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      group.setOpenId(val ? id : null);
    } else {
      setLocalOpen(val);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-muted/60 transition-colors">
          <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="flex-1 text-sm font-medium text-left">{label}</span>
          <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─────────── User IDs (collapsible) ─────────── */
function UserIdsCollapsible({ userId, customerId }: { userId: string; customerId: string | null }) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

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

  const copyToClipboard = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
  };

  const idItems = [
    customerId && { label: 'Customer', value: customerId, key: 'customer' },
    affiliateApp?.affiliate_id && { label: 'Affiliate', value: affiliateApp.affiliate_id, key: 'affiliate' },
    store?.store_id && { label: 'Seller', value: store.store_id, key: 'seller' },
  ].filter(Boolean) as { label: string; value: string; key: string }[];

  if (idItems.length === 0) return null;

  return (
    <ExpandableSection icon={Hash} label="Your IDs">
      <div className="space-y-2 pt-1">
        {idItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/40">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">{item.label} ID</span>
              <span className="text-xs font-mono text-foreground truncate block">{item.value}</span>
            </div>
            <button
              onClick={() => copyToClipboard(item.value, item.key)}
              className="shrink-0 h-7 w-7 rounded-md bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedStates[item.key] ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
}

/* ═══════════════════════════════════════════ */
/*                  ACCOUNT PAGE               */
/* ═══════════════════════════════════════════ */

const Account = forwardRef<HTMLDivElement>(function Account(_, ref) {
  usePageTracking({ pagePath: '/account' });
  const { user, session, signOut, loading: authLoading } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { badges, userBadges } = useBadges();
  
  const { hasAccess: hasMarketplaceAccess } = useMarketplaceAccess();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  // ─── Profile query ───
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: discordAvatar } = useQuery({
    queryKey: ['discord-avatar', profile?.discord_id],
    queryFn: async () => {
      if (!profile?.discord_id) return null;
      const cacheKey = `discord-avatar-${profile.discord_id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, ts } = JSON.parse(cached);
          if (Date.now() - ts < 60 * 60 * 1000) return cachedData;
        } catch {}
      }
      const { data, error } = await supabase.functions.invoke('get-discord-avatar', {
        body: { discord_id: profile.discord_id },
      });
      if (error) return null;
      localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      return data;
    },
    enabled: !!profile?.discord_id,
    staleTime: 1000 * 60 * 60,
  });

  // ─── Ensure profile exists ───
  useEffect(() => {
    if (!user?.id || !user.email || profileLoading || profile) return;
    const run = async () => {
      const usernameValue = fallbackDisplayName || user.email?.split('@')[0] || 'user';
      const { error } = await supabase.from('profiles').insert({
        user_id: user.id,
        email: user.email,
        display_name: fallbackDisplayName || null,
        username: usernameValue,
      });
      if (!error) queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    };
    void run();
  }, [user?.id, user?.email, profileLoading, profile, fallbackDisplayName, queryClient]);

  // ─── Email subscription from signup ───
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
        } catch {}
      }
    };
    handlePendingSubscription();
  }, [user?.id, user?.email]);

  // ─── Username editing ───
  useEffect(() => {
    const trimmed = newUsername.trim();
    if (!editingUsername || !trimmed || trimmed.length < 6 || trimmed.length > 20) {
      setUsernameAvailable(null);
      return;
    }
    if (trimmed.toLowerCase() === profile?.display_name?.toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }
    const id = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const { data: isAvailable } = await supabase.rpc('is_username_available', { username: trimmed });
        setUsernameAvailable(isAvailable ?? false);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [newUsername, editingUsername, profile?.display_name]);

  const displayNameCooldownMs = 30 * 24 * 60 * 60 * 1000;
  const getCooldownInfo = () => {
    if (!profile?.display_name_changed_at) return { onCooldown: false, remainingDays: 0 };
    const cooldownEnds = new Date(profile.display_name_changed_at).getTime() + displayNameCooldownMs;
    if (Date.now() >= cooldownEnds) return { onCooldown: false, remainingDays: 0 };
    return { onCooldown: true, remainingDays: Math.ceil((cooldownEnds - Date.now()) / (24 * 60 * 60 * 1000)) };
  };
  const cooldownInfo = getCooldownInfo();

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!user || !trimmed || trimmed.length < 6 || trimmed.length > 20 || usernameAvailable === false || cooldownInfo.onCooldown) return;
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed, display_name_changed_at: new Date().toISOString() })
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

  // ─── Data queries ───
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      let { data, error } = await supabase
        .from('orders')
        .select('id, status, total, created_at, discount_amount')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!(user?.id || user?.email),
  });

  const { data: walletData } = useQuery({
    queryKey: ['wallet-balance-quick', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', user!.id)
        .maybeSingle();
      return { balance: Number(data?.balance ?? 0) };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async () => {
      const { count, error } = await (supabase.from('notifications') as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) return 0;
      return (count as number) || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });

  const totalSpent = useMemo(() => {
    if (!orders) return 0;
    return orders
      .filter((o: any) => o.status === 'paid' || o.status === 'completed')
      .reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  }, [orders]);

  const completedOrders = orders?.filter((o: any) => o.status === 'paid' || o.status === 'completed').length ?? 0;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  // ─── Status badges ───
  const { data: affiliateStatus } = useQuery({
    queryKey: ['affiliate-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('affiliate_applications')
        .select('affiliate_id')
        .eq('user_id', user!.id)
        .eq('status', 'approved')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const { data: sellerStore } = useQuery({
    queryKey: ['seller-status', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, store_id')
        .eq('owner_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  // ─── Loading / auth guards ───
  if (authLoading) {
    return (
      <MainLayout>
        <div className="container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

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

  return (
    <MainLayout>
      <div className="container py-4 space-y-3 max-w-lg mx-auto">

        {/* ═══ Profile Header ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-0">
            <div className="p-5 flex flex-col items-center text-center gap-2 relative">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url || null}
                discordAvatarUrl={discordAvatar?.avatar_url || null}
                displayName={profile?.display_name || fallbackDisplayName || ''}
                onAvatarChange={() => queryClient.invalidateQueries({ queryKey: ['profile', user.id] })}
                compact
              />

              {/* Name */}
              <div className="w-full max-w-xs">
                {editingUsername ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="px-2 py-1 text-base font-bold tracking-tight rounded-md border bg-input w-full pr-8 text-center"
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
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={handleSaveUsername}
                      disabled={savingUsername || !newUsername.trim() || usernameAvailable === false || newUsername.trim().length < 2}>
                      {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0"
                      onClick={() => { setEditingUsername(false); setNewUsername(''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight">
                      {profile?.display_name || fallbackDisplayName || 'User'}
                    </h1>
                    {!cooldownInfo.onCooldown ? (
                      <button onClick={startEditingUsername} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0">
                        <Pencil className="h-3 w-3" />
                      </button>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground/60 p-0.5 cursor-help shrink-0"><Clock className="h-3 w-3" /></span>
                          </TooltipTrigger>
                          <TooltipContent><p>You can change your name in {cooldownInfo.remainingDays}d</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">@{profile?.username || fallbackDisplayName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">


                {affiliateStatus?.affiliate_id && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <Award className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold text-amber-500">Affiliate</span>
                  </div>
                )}
                {sellerStore?.id && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <Store className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-500">Seller</span>
                  </div>
                )}
              </div>

              {/* Sign Out */}
              <div className="absolute top-4 right-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowSignOutDialog(true)}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sign Out</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 border-t border-border divide-x divide-border">
              <Link to="/purchases" className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors">
                <Download className="h-4 w-4 text-primary mb-1" />
                <span className="text-xs font-bold">{completedOrders}</span>
                <span className="text-[10px] text-muted-foreground">Purchases</span>
              </Link>
              <Link to="/credits" className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors">
                <CreditCard className="h-4 w-4 text-primary mb-1" />
                <span className="text-xs font-bold">£{walletData?.balance != null ? Number(walletData.balance).toFixed(2) : '–'}</span>
                <span className="text-[10px] text-muted-foreground">Wallet</span>
              </Link>
              <Link to="/chat-history" className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors">
                <MessageSquare className="h-4 w-4 text-primary mb-1" />
                <span className="text-[10px] text-muted-foreground">Support</span>
              </Link>
              <Link to="/notifications" className="flex flex-col items-center justify-center py-3 hover:bg-muted/50 transition-colors relative">
                <Bell className="h-4 w-4 text-primary mb-1" />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute top-2 right-1/4 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">Alerts</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ Shopping ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-1">
            <SectionHeader title="Shopping" />
            <NavRow icon={Download} label="My Purchases" to="/purchases" />
            <NavRow icon={ShoppingBag} label="Order History" to="/purchases" badge={orders?.length || undefined} />
            <NavRow icon={Heart} label="Wishlist" to="/wishlist" />
            <NavRow icon={CreditCard} label="Wallet & Credits" to="/credits" badge={walletData?.balance ? `£${Number(walletData.balance).toFixed(2)}` : undefined} />
          </div>
        </div>

        {/* ═══ Account ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <AccordionGroup>
          <div className="p-1">
            <SectionHeader title="Account" />
            <ExpandableSection icon={Link2} label="Linked Accounts">
              <LinkedAccountsCard
                userId={user.id}
                discordId={profile?.discord_id || null}
                discordUsername={profile?.discord_username || null}
                robloxUserId={profile?.roblox_user_id || null}
                robloxUsername={profile?.roblox_username || null}
                hasEclipsePlus={false}
                accountsLocked={(profile as any)?.accounts_locked}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
                  queryClient.invalidateQueries({ queryKey: ['user-profile-linked-accounts', user.id] });
                  queryClient.invalidateQueries({ queryKey: ['discord-avatar'] });
                }}
              />
            </ExpandableSection>
            <ExpandableSection icon={Shield} label="Saved Payment Methods">
              <SavedCardsCard />
            </ExpandableSection>
            <DataExportButton />
          </div>
          </AccordionGroup>
        </div>

        {/* ═══ Preferences ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <AccordionGroup>
          <div className="p-1">
            <SectionHeader title="Preferences" />
            <ExpandableSection icon={Bell} label="Notifications">
              <NotificationSettingsCard />
            </ExpandableSection>
            <ExpandableSection icon={Mail} label="Email Preferences">
              <EmailSubscriptionCard />
            </ExpandableSection>
            <ExpandableSection icon={Volume2} label="Sound Effects">
              <SoundCustomizationCard />
            </ExpandableSection>
          </div>
          </AccordionGroup>
        </div>

        {/* ═══ More ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-1">
            <SectionHeader title="More" />
            {hasMarketplaceAccess && (
              <ExpandableSection icon={Store} label="Become a Seller">
                <BecomeSellerCard />
              </ExpandableSection>
            )}
            <ExpandableSection icon={Gift} label="Referrals">
              <ReferralCard />
            </ExpandableSection>
            <ExpandableSection icon={Award} label="Affiliate Program">
              <AffiliateCard />
            </ExpandableSection>
            <ExpandableSection icon={CreditCard} label="Credits & Rewards">
              <CreditsCard />
            </ExpandableSection>
            <UserIdsCollapsible userId={user.id} customerId={profile?.customer_id || null} />
          </div>
        </div>

        {/* ═══ Danger Zone ═══ */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="p-1">
            <button onClick={() => setShowDeleteDialog(true)} className="w-full">
              <NavRow icon={Trash2} label="Delete Account" destructive />
            </button>
          </div>
        </div>

        {/* App Version */}
        <p className="text-center text-[10px] text-muted-foreground/60 pb-4">Eclipse v3.0</p>

        {/* Dialogs */}
        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={handleSignOut}
          isLoading={isSigningOut}
        />
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
