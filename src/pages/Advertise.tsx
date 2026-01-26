import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
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
import { useAdTiers, useAdSubscription, useAdSubscriptionCheckout, usePurchasePings, calculateAdAnnualSavingsPercent, AdTier, AdBillingPeriod } from '@/hooks/useAdSubscription';
import { Megaphone, Loader2, CheckCircle, ExternalLink, Image, Link2, AtSign, Sparkles, AlertCircle, Crown, Zap, Star, Bell, Users, Plus, Minus, ShoppingCart } from 'lucide-react';
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

  const { data: tiers, isLoading: tiersLoading } = useAdTiers();
  const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useAdSubscription();
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

      const { data, error } = await supabase.functions.invoke('post-subscription-ad', {
        body: { 
          title, 
          description, 
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          discordUsername: discordUsername || null,
          pingType: selectedPing === 'none' ? null : selectedPing,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setLinkUrl('');
      setDiscordUsername('');
      setSelectedPing('none');
      refetchSubscription();
      refetchSubscription();
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
    if (herePingsToBuy === 0 && everyonePingsToBuy === 0) {
      toast.error('Please select at least one ping to purchase');
      return;
    }
    purchasePingsMutation.mutate({ 
      herePings: herePingsToBuy,
      everyonePings: everyonePingsToBuy,
    });
  };

  const isLoading = tiersLoading || subLoading || authLoading;

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
                  <p className="text-sm text-muted-foreground">Purchase ping credits to use on your ads</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">@here pings (£0.79 each)</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setHerePingsToBuy(Math.max(0, herePingsToBuy - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{herePingsToBuy}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setHerePingsToBuy(Math.min(50, herePingsToBuy + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">@everyone pings (£1.49 each)</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEveryonePingsToBuy(Math.max(0, everyonePingsToBuy - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{everyonePingsToBuy}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEveryonePingsToBuy(Math.min(50, everyonePingsToBuy + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm font-medium">
                      Total: {formatCurrency(herePingsToBuy * 0.79 + everyonePingsToBuy * 1.49)}
                    </p>
                    <Button 
                      onClick={handlePurchasePings}
                      disabled={purchasePingsMutation.isPending || (herePingsToBuy === 0 && everyonePingsToBuy === 0)}
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
                    <CardTitle>Create Your Advertisement</CardTitle>
                    <CardDescription>
                      Fill out the form below to post your Discord advertisement
                    </CardDescription>
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
                          <Image className="h-4 w-4" />
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

                      <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={postAdMutation.isPending}
                      >
                        {postAdMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Post Advertisement ({subscription.ads_remaining} remaining)
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
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatCurrency(price)}</span>
                        <span className="text-muted-foreground">
                          /{billingPeriod === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingPeriod === 'annual' && savingsPercent > 0 && (
                        <p className="text-sm text-green-500 mt-1">
                          Save {savingsPercent}% vs monthly
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
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
                      disabled={checkoutMutation.isPending || !user}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {user ? 'Subscribe' : 'Sign in to Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
