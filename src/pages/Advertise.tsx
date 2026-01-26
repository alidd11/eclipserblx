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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdTiers, useAdSubscription, useAdSubscriptionCheckout, usePurchasePings, calculateAdAnnualSavingsPercent, AdTier, AdBillingPeriod } from '@/hooks/useAdSubscription';
import { Megaphone, Loader2, CheckCircle, ExternalLink, Image as ImageIcon, Link2, AtSign, Sparkles, AlertCircle, Crown, Zap, Star, Bell, Users, Plus, Minus, ShoppingCart, History, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

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
  const { user, loading: authLoading, session } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [selectedPing, setSelectedPing] = useState<'none' | 'here' | 'everyone'>('none');
  const [billingPeriod, setBillingPeriod] = useState<AdBillingPeriod>('monthly');
  
  // Scheduling state (Pro+ only)
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('12:00');
  
  // Ping purchase quantities for checkout
  const [herePingsToAdd, setHerePingsToAdd] = useState(0);
  const [everyonePingsToAdd, setEveryonePingsToAdd] = useState(0);
  
  // Separate ping purchase modal state
  const [showPingPurchase, setShowPingPurchase] = useState(false);
  const [herePingsToBuy, setHerePingsToBuy] = useState(5);
  const [everyonePingsToBuy, setEveryonePingsToBuy] = useState(5);
  
  const subscriptionSuccess = searchParams.get('subscription_success') === 'true';
  const subscriptionCancelled = searchParams.get('subscription_cancelled') === 'true';
  const pingsPurchased = searchParams.get('pings_purchased') === 'true';
  const pingsCancelled = searchParams.get('pings_cancelled') === 'true';

  // Check if user has Discord linked
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-discord-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('discord_id, discord_username')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasDiscordLinked = !!profile?.discord_id;

  // Fetch last posted advertisement
  const { data: lastAd, isLoading: lastAdLoading } = useQuery({
    queryKey: ['last-advertisement', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('discord_advertisements')
        .select('title, description, image_url, link_url, discord_username')
        .eq('user_id', user.id)
        .eq('status', 'posted')
        .order('posted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const loadLastAd = () => {
    if (lastAd) {
      setTitle(lastAd.title || '');
      setDescription(lastAd.description || '');
      setImageUrl(lastAd.image_url || '');
      setLinkUrl(lastAd.link_url || '');
      setDiscordUsername(lastAd.discord_username || '');
      toast.success('Loaded last advertisement');
    }
  };

  // Admin testing bypass - grant full access without payment
  const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';
  const isAdminTester = user?.email === PRIMARY_ADMIN_EMAIL;

  const { data: tiers, isLoading: tiersLoading } = useAdTiers();
  const { data: realSubscription, isLoading: subLoading, refetch: refetchSubscription } = useAdSubscription();
  
  // For admin tester, simulate a premium subscription if they don't have one
  const subscription = isAdminTester && !realSubscription?.subscribed 
    ? {
        subscribed: true,
        tier: 'premium' as const,
        tier_name: 'Premium (Test Mode)',
        ads_per_month: 999,
        ads_remaining: 999,
        billing_period: 'monthly' as const,
        here_pings_balance: 99,
        everyone_pings_balance: 99,
      }
    : realSubscription;

  // Check if scheduling is available (Pro+ tiers)
  const canSchedule = subscription?.tier === 'pro' || subscription?.tier === 'premium';

  const checkoutMutation = useAdSubscriptionCheckout();
  const purchasePingsMutation = usePurchasePings();

  useEffect(() => {
    if (subscriptionSuccess) {
      toast.success('Subscription activated! You can now post ads.');
      refetchSubscription();
    }
    if (subscriptionCancelled) {
      toast.error('Subscription checkout was cancelled');
    }
    if (pingsPurchased) {
      const herePurchased = searchParams.get('here') || '0';
      const everyonePurchased = searchParams.get('everyone') || '0';
      toast.success(`Ping credits added! ${herePurchased} @here, ${everyonePurchased} @everyone`);
      refetchSubscription();
    }
    if (pingsCancelled) {
      toast.error('Ping purchase was cancelled');
    }
  }, [subscriptionSuccess, subscriptionCancelled, pingsPurchased, pingsCancelled]);

  // Post ad mutation (for subscribers)
  const postAdMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) {
        throw new Error('Please sign in to post an advertisement');
      }

      // Build scheduled_for timestamp if date is selected
      let scheduledFor: string | null = null;
      if (scheduledDate && canSchedule) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledFor = scheduled.toISOString();
      }

      const { data, error } = await supabase.functions.invoke('post-subscription-ad', {
        body: { 
          title, 
          description, 
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          discordUsername: discordUsername || null,
          pingType: selectedPing === 'none' ? null : selectedPing,
          scheduledFor,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setLinkUrl('');
      setDiscordUsername('');
      setSelectedPing('none');
      setScheduledDate(undefined);
      setScheduledTime('12:00');
      refetchSubscription();
      if (data?.scheduled) {
        toast.success('Advertisement scheduled successfully!');
      } else {
        toast.success('Advertisement posted successfully!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to post advertisement');
    },
  });

  const handlePostAd = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to post an advertisement');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    postAdMutation.mutate();
  };

  const handleSubscribe = (tier: AdTier) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }
    if (!hasDiscordLinked) {
      toast.error('Please link your Discord account first to purchase advertising services');
      return;
    }
    checkoutMutation.mutate({ 
      tier, 
      billingPeriod,
      herePings: herePingsToAdd,
      everyonePings: everyonePingsToAdd,
    });
  };

  const handlePurchasePings = () => {
    if (!user) {
      toast.error('Please sign in to purchase pings');
      return;
    }
    if (!hasDiscordLinked) {
      toast.error('Please link your Discord account first to purchase pings');
      return;
    }
    if (herePingsToBuy === 0 && everyonePingsToBuy === 0) {
      toast.error('Please select at least one ping to purchase');
      return;
    }
    purchasePingsMutation.mutate({ 
      herePings: herePingsToBuy,
      everyonePings: everyonePingsToBuy,
    });
  };

  const isLoading = tiersLoading || subLoading || authLoading || profileLoading;

  // If user has active subscription, show the ad posting form
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
                    <p className="text-sm text-muted-foreground">
                      {subscription.ads_remaining} of {subscription.ads_per_month} ads remaining this month
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {subscription.billing_period === 'annual' ? 'Annual' : 'Monthly'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Ping Balance Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Ping Credits
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPingPurchase(!showPingPurchase)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy More
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <p className="text-2xl font-bold text-green-500">{herePingsAvailable}</p>
                  <p className="text-sm text-muted-foreground">@here pings</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <p className="text-2xl font-bold text-yellow-500">{everyonePingsAvailable}</p>
                  <p className="text-sm text-muted-foreground">@everyone pings</p>
                </div>
              </div>

              {showPingPurchase && (
                <div className="pt-4 border-t border-border space-y-4">
                  {/* Bulk Discount Banner */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-sm font-medium text-primary mb-2">🎉 Bulk Discounts Available!</p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setHerePingsToBuy(5);
                          setEveryonePingsToBuy(0);
                        }}
                        className="text-center p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-transparent hover:border-green-500/50"
                      >
                        <p className="font-bold text-green-500">5%</p>
                        <p className="text-muted-foreground">5+ pings</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHerePingsToBuy(10);
                          setEveryonePingsToBuy(0);
                        }}
                        className="text-center p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-transparent hover:border-green-500/50"
                      >
                        <p className="font-bold text-green-500">10%</p>
                        <p className="text-muted-foreground">10+ pings</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHerePingsToBuy(25);
                          setEveryonePingsToBuy(0);
                        }}
                        className="text-center p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-transparent hover:border-green-500/50"
                      >
                        <p className="font-bold text-green-500">20%</p>
                        <p className="text-muted-foreground">25+ pings</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHerePingsToBuy(50);
                          setEveryonePingsToBuy(0);
                        }}
                        className="text-center p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors cursor-pointer border border-transparent hover:border-green-500/50"
                      >
                        <p className="font-bold text-green-500">30%</p>
                        <p className="text-muted-foreground">50+ pings</p>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">Purchase ping credits to use on your ads</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label className="text-sm whitespace-nowrap">@here pings</Label>
                        <div className="flex items-center gap-2">
                          {herePingsToBuy >= 5 && (
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500 shrink-0">
                              {herePingsToBuy >= 50 ? '30%' : herePingsToBuy >= 25 ? '20%' : herePingsToBuy >= 10 ? '10%' : '5%'} off
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {herePingsToBuy >= 5 
                              ? `£${(0.79 * (1 - (herePingsToBuy >= 50 ? 0.30 : herePingsToBuy >= 25 ? 0.20 : herePingsToBuy >= 10 ? 0.10 : 0.05))).toFixed(2)} each`
                              : '£0.79 each'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setHerePingsToBuy(Math.max(0, herePingsToBuy - 1))}
                          className="shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={herePingsToBuy}
                          onChange={(e) => setHerePingsToBuy(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-full text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setHerePingsToBuy(Math.min(100, herePingsToBuy + 1))}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label className="text-sm whitespace-nowrap">@everyone pings</Label>
                        <div className="flex items-center gap-2">
                          {everyonePingsToBuy >= 5 && (
                            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500 shrink-0">
                              {everyonePingsToBuy >= 50 ? '30%' : everyonePingsToBuy >= 25 ? '20%' : everyonePingsToBuy >= 10 ? '10%' : '5%'} off
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {everyonePingsToBuy >= 5 
                              ? `£${(1.49 * (1 - (everyonePingsToBuy >= 50 ? 0.30 : everyonePingsToBuy >= 25 ? 0.20 : everyonePingsToBuy >= 10 ? 0.10 : 0.05))).toFixed(2)} each`
                              : '£1.49 each'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEveryonePingsToBuy(Math.max(0, everyonePingsToBuy - 1))}
                          className="shrink-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={everyonePingsToBuy}
                          onChange={(e) => setEveryonePingsToBuy(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-full text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEveryonePingsToBuy(Math.min(100, everyonePingsToBuy + 1))}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div>
                      {(() => {
                        const hereDiscount = herePingsToBuy >= 50 ? 0.30 : herePingsToBuy >= 25 ? 0.20 : herePingsToBuy >= 10 ? 0.10 : herePingsToBuy >= 5 ? 0.05 : 0;
                        const everyoneDiscount = everyonePingsToBuy >= 50 ? 0.30 : everyonePingsToBuy >= 25 ? 0.20 : everyonePingsToBuy >= 10 ? 0.10 : everyonePingsToBuy >= 5 ? 0.05 : 0;
                        const originalTotal = herePingsToBuy * 0.79 + everyonePingsToBuy * 1.49;
                        const discountedTotal = herePingsToBuy * 0.79 * (1 - hereDiscount) + everyonePingsToBuy * 1.49 * (1 - everyoneDiscount);
                        const savings = originalTotal - discountedTotal;
                        
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium whitespace-nowrap">
                              Total: {formatCurrency(discountedTotal)}
                            </p>
                            {savings > 0 && (
                              <span className="text-xs text-muted-foreground line-through whitespace-nowrap">
                                {formatCurrency(originalTotal)}
                              </span>
                            )}
                            {savings > 0.01 && (
                              <span className="text-xs text-green-500 whitespace-nowrap">
                                You save {formatCurrency(savings)}!
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <Button 
                      onClick={handlePurchasePings}
                      disabled={purchasePingsMutation.isPending || (herePingsToBuy === 0 && everyonePingsToBuy === 0)}
                      className="w-full sm:w-auto shrink-0"
                    >
                      {purchasePingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Purchase Pings
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Post an Advertisement</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Your ad will be posted to our Discord community instantly.
            </p>
          </div>

          {subscription.ads_remaining === 0 ? (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <p className="text-yellow-500">
                    You've used all your ads for this month. Upgrade your plan or wait until next month.
                  </p>
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
                        <CardDescription>
                          Fill out the form below to post your Discord advertisement
                        </CardDescription>
                      </div>
                      {lastAd && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={loadLastAd}
                          disabled={lastAdLoading}
                          className="shrink-0"
                        >
                          <History className="h-4 w-4 mr-2" />
                          Load Last Ad
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePostAd} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title">
                          Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="title"
                          placeholder="Your catchy headline"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          maxLength={100}
                        />
                        <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">
                          Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe what you're advertising..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={500}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageUrl" className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image URL (optional)
                        </Label>
                        <Input
                          id="imageUrl"
                          type="url"
                          placeholder="https://example.com/image.png"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkUrl" className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Link URL (optional)
                        </Label>
                        <Input
                          id="linkUrl"
                          type="url"
                          placeholder="https://discord.gg/your-server"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discordUsername" className="flex items-center gap-2">
                          <AtSign className="h-4 w-4" />
                          Discord Username (optional)
                        </Label>
                        <Input
                          id="discordUsername"
                          placeholder="YourName#1234"
                          value={discordUsername}
                          onChange={(e) => setDiscordUsername(e.target.value)}
                        />
                      </div>

                      {/* Ping Options - Use purchased credits */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Use Ping Credit
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPing('none')}
                            className={cn(
                              "p-3 rounded-lg border text-sm transition-all",
                              selectedPing === 'none'
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <span className="font-medium">None</span>
                            <p className="text-xs mt-1">Default</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => herePingsAvailable > 0 && setSelectedPing('here')}
                            disabled={herePingsAvailable === 0}
                            className={cn(
                              "p-3 rounded-lg border text-sm transition-all",
                              selectedPing === 'here'
                                ? "border-green-500 bg-green-500/10 text-foreground"
                                : herePingsAvailable === 0
                                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                                  : "border-border bg-card text-muted-foreground hover:border-green-500/50"
                            )}
                          >
                            <span className="font-medium flex items-center justify-center gap-1">
                              <Users className="h-3 w-3" />
                              @here
                            </span>
                            <p className="text-xs mt-1 text-green-500">
                              {herePingsAvailable} available
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => everyonePingsAvailable > 0 && setSelectedPing('everyone')}
                            disabled={everyonePingsAvailable === 0}
                            className={cn(
                              "p-3 rounded-lg border text-sm transition-all",
                              selectedPing === 'everyone'
                                ? "border-yellow-500 bg-yellow-500/10 text-foreground"
                                : everyonePingsAvailable === 0
                                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                                  : "border-border bg-card text-muted-foreground hover:border-yellow-500/50"
                            )}
                          >
                            <span className="font-medium flex items-center justify-center gap-1">
                              <Megaphone className="h-3 w-3" />
                              @everyone
                            </span>
                            <p className="text-xs mt-1 text-yellow-500">
                              {everyonePingsAvailable} available
                            </p>
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {herePingsAvailable === 0 && everyonePingsAvailable === 0 
                            ? "No ping credits available. Purchase more above!" 
                            : "Select a ping to use one of your purchased credits"}
                        </p>
                      </div>

                      {/* Scheduling (Pro+ only) */}
                      {canSchedule && (
                        <div className="space-y-3 p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
                          <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            Schedule Ad (Pro+ Feature)
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Date</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal",
                                      !scheduledDate && "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {scheduledDate ? format(scheduledDate, "PPP") : "Post immediately"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={scheduledDate}
                                    onSelect={setScheduledDate}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                  {scheduledDate && (
                                    <div className="p-3 border-t">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setScheduledDate(undefined)}
                                        className="w-full"
                                      >
                                        Clear (Post Immediately)
                                      </Button>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Time</Label>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="time"
                                  value={scheduledTime}
                                  onChange={(e) => setScheduledTime(e.target.value)}
                                  disabled={!scheduledDate}
                                  className="pl-10"
                                />
                              </div>
                            </div>
                          </div>
                          {scheduledDate && (
                            <p className="text-xs text-purple-500">
                              Your ad will be posted on {format(scheduledDate, "PPP")} at {scheduledTime}
                            </p>
                          )}
                        </div>
                      )}

                      {!canSchedule && subscription?.tier === 'basic' && (
                        <div className="p-3 rounded-lg border border-border bg-muted/30">
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Upgrade to <strong>Pro</strong> or <strong>Premium</strong> to schedule ads in advance</span>
                          </p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={postAdMutation.isPending}
                      >
                        {postAdMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : scheduledDate ? (
                          <Calendar className="h-4 w-4 mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {scheduledDate 
                          ? `Schedule Advertisement (${subscription.ads_remaining} remaining)`
                          : `Post Advertisement (${subscription.ads_remaining} remaining)`
                        }
                        {selectedPing !== 'none' && (
                          <span className="ml-1 text-xs opacity-75">
                            with @{selectedPing} ping
                          </span>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#2f3136] rounded-lg p-3 text-white text-sm space-y-2">
                      <div className={cn(
                        "border-l-4 pl-3",
                        subscription.tier === 'premium' ? 'border-yellow-500' : 
                        subscription.tier === 'pro' ? 'border-purple-500' : 'border-blue-500'
                      )}>
                        <p className="font-semibold">
                          📢 {title || 'Your Title Here'}
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          {description || 'Your description will appear here...'}
                        </p>
                        {linkUrl && (
                          <p className="text-blue-400 text-xs mt-2 flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Learn More
                          </p>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        Sponsored • {discordUsername ? `@${discordUsername}` : 'Eclipse Ads'} • {subscription.tier_name}
                      </p>
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

  // Show subscription tiers for non-subscribers
  return (
    <MainLayout>
      <div className="container max-w-5xl py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Advertise on Discord</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Promote your server, project, or services to our active Discord community. 
            Choose a plan that fits your advertising needs.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-lg bg-muted p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                billingPeriod === 'monthly' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                billingPeriod === 'annual' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge variant="secondary" className="text-xs">Save up to 17%</Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {tiers?.map((tier) => {
              const price = billingPeriod === 'annual' ? tier.annual_price_gbp : tier.monthly_price_gbp;
              const savingsPercent = calculateAdAnnualSavingsPercent(tier.monthly_price_gbp, tier.annual_price_gbp);
              
              return (
                <Card 
                  key={tier.id} 
                  className={cn(
                    "relative overflow-hidden transition-all hover:shadow-lg",
                    tier.tier === 'pro' && "border-primary ring-1 ring-primary",
                    tierColors[tier.tier]
                  )}
                >
                  {tier.tier === 'pro' && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                      Popular
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {tierIcons[tier.tier]}
                      <CardTitle>{tier.name}</CardTitle>
                    </div>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      {billingPeriod === 'annual' ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              {formatCurrency(tier.annual_price_gbp / 12)}
                            </span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(tier.monthly_price_gbp)}/mo
                            </span>
                            {savingsPercent > 0 && (
                              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                                Save {savingsPercent}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatCurrency(tier.annual_price_gbp)} billed annually
                          </p>
                        </>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{formatCurrency(price)}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium">Up to {tier.max_images} images per ad</span>
                      </div>
                      {tier.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full"
                      variant={tier.tier === 'pro' ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(tier.tier)}
                      disabled={checkoutMutation.isPending || !user || (user && !hasDiscordLinked)}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {!user ? 'Sign in to Subscribe' : !hasDiscordLinked ? 'Link Discord to Subscribe' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {user && !hasDiscordLinked && !profileLoading && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-500">
              You need to link your Discord account before purchasing advertising services.{' '}
              <Link to="/account" className="underline hover:no-underline font-medium">
                Link Discord in Account Settings
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!user && !authLoading && (
          <div className="text-center">
            <p className="text-muted-foreground">
              <a href="/auth" className="text-primary hover:underline">Sign in</a> to subscribe to an advertising plan.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
