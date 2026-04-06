import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdTiers, useAdSubscription, useAdSubscriptionCheckout, AdTier, AdBillingPeriod } from '@/hooks/useAdSubscription';
import { Megaphone, Loader2, ExternalLink, Image as ImageIcon, Link2, AtSign, Sparkles, AlertCircle, Crown, Zap, Star, Bell, Users, History, Calendar } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { AdSlotPicker, SelectedSlot } from '@/components/ads/AdSlotPicker';
import { AdPingPurchase } from '@/components/ads/AdPingPurchase';
import { AdPricingView } from '@/components/ads/AdPricingView';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { usePageMeta } from '@/hooks/usePageMeta';

const tierIcons: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  pro: <Star className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

const tierColors: Record<string, string> = {
  basic: 'border-blue-500/50 bg-blue-500/5',
  pro: 'border-purple-500/50 bg-purple-500/5',
  premium: 'border-yellow-500/50 bg-yellow-500/5',
};

export default function Advertise() {
  usePageMeta({ title: 'Advertise', description: 'Promote your products and Discord server on Eclipse. Reach thousands of Roblox roleplay enthusiasts.', canonicalPath: '/advertise' });
  const { user, loading: authLoading, session } = useAuth();
  const [searchParams] = useSearchParams();

  const [adFormData, setAdFormData, clearAdFormData] = useFormPersistence('advertise-form', {
    title: '',
    description: '',
    imageUrls: ['', '', ''] as string[],
    linkUrl: '',
    discordUsername: '',
  });

  const [selectedPing, setSelectedPing] = useState<'none' | 'here' | 'everyone'>('none');
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<AdBillingPeriod>('monthly');
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [herePingsToAdd, setHerePingsToAdd] = useState(0);
  const [everyonePingsToAdd, setEveryonePingsToAdd] = useState(0);

  const subscriptionSuccess = searchParams.get('subscription_success') === 'true';
  const subscriptionCancelled = searchParams.get('subscription_cancelled') === 'true';
  const pingsPurchased = searchParams.get('pings_purchased') === 'true';
  const pingsCancelled = searchParams.get('pings_cancelled') === 'true';

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-discord-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('discord_id, discord_username').eq('user_id', user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasDiscordLinked = !!profile?.discord_id;

  const { data: lastAd, isLoading: lastAdLoading } = useQuery({
    queryKey: ['last-advertisement', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('discord_advertisements').select('title, description, image_url, link_url, discord_username').eq('user_id', user.id).eq('status', 'posted').order('posted_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const loadLastAd = () => {
    if (lastAd) {
      setAdFormData({
        title: lastAd.title || '',
        description: lastAd.description || '',
        imageUrls: [lastAd.image_url || '', '', ''],
        linkUrl: lastAd.link_url || '',
        discordUsername: lastAd.discord_username || '',
      });
      toast.success('Loaded last advertisement');
    }
  };

  const { roles } = useAdminAuth();
  const isAdminTester = !!user && roles?.includes('admin');

  const { data: tiers, isLoading: tiersLoading } = useAdTiers();
  const { data: realSubscription, isLoading: subLoading, refetch: refetchSubscription } = useAdSubscription();

  const { data: robuxPrices } = useQuery({
    queryKey: ['robux-ad-prices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('key, value').in('key', ['robux_ad_basic_robux_price', 'robux_ad_pro_robux_price', 'robux_ad_premium_robux_price']);
      if (error) throw error;
      const prices: Record<string, number> = {};
      data?.forEach((s) => { const tier = s.key.replace('robux_ad_', '').replace('_robux_price', ''); prices[tier] = parseInt(s.value as string) || 0; });
      return prices;
    },
  });

  const subscription = isAdminTester && !realSubscription?.subscribed
    ? { subscribed: true, tier: 'premium' as const, tier_name: 'Premium (Test Mode)', ads_per_month: 999, ads_remaining: 999, billing_period: 'monthly' as const, here_pings_balance: 99, everyone_pings_balance: 99 }
    : realSubscription;

  const checkoutMutation = useAdSubscriptionCheckout();

  useEffect(() => {
    if (subscriptionSuccess) { toast.success('Subscription activated! You can now post ads.'); refetchSubscription(); }
    if (subscriptionCancelled) { toast.error('Subscription checkout was cancelled'); }
    if (pingsPurchased) {
      const h = searchParams.get('here') || '0';
      const e = searchParams.get('everyone') || '0';
      toast.success(`Ping credits added! ${h} @here, ${e} @everyone`);
      refetchSubscription();
    }
    if (pingsCancelled) { toast.error('Ping purchase was cancelled'); }
  }, [subscriptionSuccess, subscriptionCancelled, pingsPurchased, pingsCancelled]);

  const postAdMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error('Please sign in to post an advertisement');
      let scheduledFor: string | null = null;
      let slotId: string | null = null;
      if (selectedSlot) {
        const [hours, minutes] = selectedSlot.time.split(':').map(Number);
        const scheduled = new Date(selectedSlot.date);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledFor = scheduled.toISOString();
        slotId = selectedSlot.slotId;
      }
      const { data, error } = await supabase.functions.invoke('post-subscription-ad', {
        body: { title: adFormData.title, description: adFormData.description, imageUrls: adFormData.imageUrls?.filter(u => u.trim()) || [], linkUrl: adFormData.linkUrl || null, discordUsername: adFormData.discordUsername || null, pingType: selectedPing === 'none' ? null : selectedPing, scheduledFor, slotId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      clearAdFormData();
      setSelectedPing('none');
      setSelectedSlot(null);
      refetchSubscription();
      toast.success(data?.scheduled ? 'Advertisement scheduled successfully!' : 'Advertisement posted successfully!');
    },
    onError: (error: Error) => { toast.error(error.message || 'Failed to post advertisement'); },
  });

  const handlePostAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to post an advertisement'); return; }
    if (!adFormData.title.trim()) { toast.error('Please enter a title'); return; }
    if (!adFormData.description.trim()) { toast.error('Please enter a description'); return; }
    postAdMutation.mutate();
  };

  const handleSubscribe = (tier: AdTier) => {
    if (!user) { toast.error('Please sign in to subscribe'); return; }
    if (!hasDiscordLinked) { toast.error('Please link your Discord account first to purchase advertising services'); return; }
    checkoutMutation.mutate({ tier, billingPeriod, herePings: herePingsToAdd, everyonePings: everyonePingsToAdd });
  };

  const handleManageSubscription = async () => {
    if (!user || !session?.access_token) { toast.error('Please sign in to manage your subscription'); return; }
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.url) { const { openExternalUrl } = await import('@/lib/externalBrowser'); await openExternalUrl(data.url); }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open subscription management');
    } finally { setIsOpeningPortal(false); }
  };

  const isLoading = tiersLoading || subLoading || authLoading || profileLoading;

  // Subscriber view
  if (subscription?.subscribed) {
    const herePingsAvailable = subscription.here_pings_balance || 0;
    const everyonePingsAvailable = subscription.everyone_pings_balance || 0;

    return (
      <MainLayout>
        <div className="container max-w-4xl py-8 space-y-8">
          {/* Subscription Status Banner */}
          <Card className={cn("border-2", tierColors[subscription.tier || 'basic'])}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {tierIcons[subscription.tier || 'basic']}
                  <div>
                    <p className="font-semibold">{subscription.tier_name} Subscriber</p>
                    <p className="text-sm text-muted-foreground">{subscription.ads_remaining} of {subscription.ads_per_month} ads remaining this month</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{subscription.billing_period === 'annual' ? 'Annual' : 'Monthly'}</Badge>
                  <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={isOpeningPortal}>
                    {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                    {isOpeningPortal ? 'Loading...' : 'Manage'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ping Purchase */}
          <AdPingPurchase
            herePingsAvailable={herePingsAvailable}
            everyonePingsAvailable={everyonePingsAvailable}
            hasDiscordLinked={hasDiscordLinked}
            userId={user?.id}
            onPurchaseSuccess={() => refetchSubscription()}
          />

          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Post an Advertisement</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Your ad will be posted to our Discord community instantly.</p>
          </div>

          {subscription.ads_remaining === 0 ? (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <p className="text-yellow-500">You've used all your ads for this month. Upgrade your plan or wait until next month.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Form */}
              <div className="md:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Create Your Advertisement</CardTitle>
                        <CardDescription>Fill out the form below to post your Discord advertisement</CardDescription>
                      </div>
                      {lastAd && (
                        <Button type="button" variant="outline" size="sm" onClick={loadLastAd} disabled={lastAdLoading} className="shrink-0">
                          <History className="h-4 w-4 mr-2" />Load Last Ad
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePostAd} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                        <Input id="title" placeholder="Your catchy headline" value={adFormData.title} onChange={(e) => setAdFormData({ title: e.target.value })} maxLength={100} />
                        <p className="text-xs text-muted-foreground">{adFormData.title.length}/100 characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                        <Textarea id="description" placeholder="Describe what you're advertising..." value={adFormData.description} onChange={(e) => setAdFormData({ description: e.target.value })} rows={4} />
                        <p className="text-xs text-muted-foreground">{adFormData.description.length} characters</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />Image URLs (optional)
                          <span className="text-xs text-muted-foreground font-normal">— up to {tiers?.find(t => t.tier === subscription?.tier)?.max_images ?? 1}</span>
                        </Label>
                        {Array.from({ length: tiers?.find(t => t.tier === subscription?.tier)?.max_images ?? 1 }).map((_, i) => (
                          <Input key={i} type="url" placeholder={`https://example.com/image${i + 1}.png`} value={(adFormData.imageUrls ?? [])[i] ?? ''} onChange={(e) => { const updated = [...(adFormData.imageUrls ?? ['', '', ''])]; updated[i] = e.target.value; setAdFormData({ imageUrls: updated }); }} />
                        ))}
                        <p className="text-xs text-muted-foreground flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-yellow-500" />
                          <span>Image URLs <strong>must end with a file extension</strong> (e.g. <code className="text-xs bg-muted px-1 rounded">.jpg</code>, <code className="text-xs bg-muted px-1 rounded">.png</code>, <code className="text-xs bg-muted px-1 rounded">.gif</code>) to display in Discord.</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkUrl" className="flex items-center gap-2"><Link2 className="h-4 w-4" />Link URL (optional)</Label>
                        <Input id="linkUrl" type="url" placeholder="https://discord.gg/your-server" value={adFormData.linkUrl} onChange={(e) => setAdFormData({ linkUrl: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discordUsername" className="flex items-center gap-2"><AtSign className="h-4 w-4" />Discord Username (optional)</Label>
                        <Input id="discordUsername" placeholder="YourName#1234" value={adFormData.discordUsername} onChange={(e) => setAdFormData({ discordUsername: e.target.value })} />
                      </div>

                      {/* Ping Options */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2"><Bell className="h-4 w-4" />Use Ping Credit</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => setSelectedPing('none')} className={cn("p-3 rounded-lg border text-sm transition-all", selectedPing === 'none' ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50")}>
                            <span className="font-medium">None</span><p className="text-xs mt-1">Default</p>
                          </button>
                          <button type="button" onClick={() => herePingsAvailable > 0 && setSelectedPing('here')} disabled={herePingsAvailable === 0} className={cn("p-3 rounded-lg border text-sm transition-all", selectedPing === 'here' ? "border-green-500 bg-green-500/10 text-foreground" : herePingsAvailable === 0 ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50" : "border-border bg-card text-muted-foreground hover:border-green-500/50")}>
                            <span className="font-medium flex items-center justify-center gap-1"><Users className="h-3 w-3" />@here</span>
                            <p className="text-xs mt-1 text-green-500">{herePingsAvailable} available</p>
                          </button>
                          <button type="button" onClick={() => everyonePingsAvailable > 0 && setSelectedPing('everyone')} disabled={everyonePingsAvailable === 0} className={cn("p-3 rounded-lg border text-sm transition-all", selectedPing === 'everyone' ? "border-yellow-500 bg-yellow-500/10 text-foreground" : everyonePingsAvailable === 0 ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50" : "border-border bg-card text-muted-foreground hover:border-yellow-500/50")}>
                            <span className="font-medium flex items-center justify-center gap-1"><Megaphone className="h-3 w-3" />@everyone</span>
                            <p className="text-xs mt-1 text-yellow-500">{everyonePingsAvailable} available</p>
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {herePingsAvailable === 0 && everyonePingsAvailable === 0 ? "No ping credits available. Purchase more above!" : "Select a ping to use one of your purchased credits"}
                        </p>
                      </div>

                      {/* Scheduling */}
                      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />Schedule Your Ad
                          {subscription?.tier === 'basic' && <span className="text-xs text-muted-foreground font-normal">(same-day or next-day)</span>}
                          {subscription?.tier === 'pro' && <span className="text-xs text-muted-foreground font-normal">(up to 3 days ahead)</span>}
                          {subscription?.tier === 'premium' && <span className="text-xs text-muted-foreground font-normal">(up to 7 days ahead)</span>}
                        </Label>
                        <AdSlotPicker tier={(subscription?.tier as 'basic' | 'pro' | 'premium') ?? 'basic'} userId={user?.id ?? ''} value={selectedSlot} onChange={setSelectedSlot} />
                        {!selectedSlot && <p className="text-xs text-muted-foreground">No slot selected — your ad will be posted immediately upon submission.</p>}
                      </div>

                      <Button type="submit" className="w-full" size="lg" disabled={postAdMutation.isPending}>
                        {postAdMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : selectedSlot ? <Calendar className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {selectedSlot ? `Schedule Advertisement (${subscription.ads_remaining} remaining)` : `Post Advertisement (${subscription.ads_remaining} remaining)`}
                        {selectedPing !== 'none' && <span className="ml-1 text-xs opacity-75">with @{selectedPing} ping</span>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="bg-[#2f3136] rounded-lg p-3 text-white text-sm space-y-2">
                      <div className={cn("border-l-4 pl-3", subscription.tier === 'premium' ? 'border-yellow-500' : subscription.tier === 'pro' ? 'border-purple-500' : 'border-blue-500')}>
                        <p className="font-semibold">📢 {adFormData.title || 'Your Title Here'}</p>
                        <p className="text-gray-300 text-xs mt-1">{adFormData.description || 'Your description will appear here...'}</p>
                        {adFormData.linkUrl && <p className="text-blue-400 text-xs mt-2 flex items-center gap-1"><ExternalLink className="h-3 w-3" />Learn More</p>}
                      </div>
                      <p className="text-gray-500 text-xs">Sponsored • {adFormData.discordUsername ? `@${adFormData.discordUsername}` : 'Eclipse Ads'} • {subscription.tier_name}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Non-subscriber pricing view
  return (
    <MainLayout>
      <AdPricingView
        tiers={tiers}
        isLoading={isLoading}
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        robuxPrices={robuxPrices}
        user={user}
        hasDiscordLinked={hasDiscordLinked}
        profileLoading={profileLoading}
        authLoading={authLoading}
        checkoutMutation={checkoutMutation}
        onSubscribe={handleSubscribe}
      />
    </MainLayout>
  );
}
