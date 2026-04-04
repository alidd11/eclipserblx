import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Crown, Check, Gift, Percent, Loader2, AlertCircle, Calendar, Clock, XCircle, Sparkles, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, ECLIPSE_PLUS_DISCOUNT } from '@/hooks/useSubscription';
import { useSubscriptionTiers, calculateAnnualSavings, calculateAnnualSavingsPercent } from '@/hooks/useSubscriptionTiers';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';

const faqs = [
  {
    question: 'What products can I get for free?',
    answer: 'You can claim products each month (1 for Eclipse+, 2 for Ultimate), except for bot products. There\'s no price limit - choose any eligible product regardless of its value.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'When do my free products refresh?',
    answer: 'Your free product claims reset on the 1st of each month at midnight UTC. Unclaimed free products do not roll over.',
  },
  {
    question: 'What\'s the difference between Eclipse+ and Ultimate?',
    answer: 'Ultimate gives you 40% off (vs 30%), 2 free products per month (vs 1), VIP Discord access, and priority support. It\'s perfect for power buyers.',
  },
  {
    question: 'Does the discount apply to everything?',
    answer: 'The discount applies to all products except those in the Eclipse Savers category and resellable products. Bot products get an additional 5%.',
  },
];

export default function EclipsePlus() {
  usePageTracking({ pagePath: '/eclipse-plus' });
  usePageMeta({
    title: 'Eclipse+ Membership',
    description: 'Join Eclipse+ for up to 40% off all products, free monthly claims, store credit bonuses and exclusive member perks.',
    canonicalPath: '/eclipse-plus',
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    isSubscribed, 
    subscriptionEnd, 
    freeProductsClaimed,
    canClaimFree, 
    isLoading, 
    subscribe, 
    openCustomerPortal 
  } = useSubscription();
  
  const { data: tiers } = useSubscriptionTiers();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<'pro' | 'premium'>('pro');
  
  const wasCanceled = searchParams.get('canceled') === 'true';

  const proTier = tiers?.find(t => t.tier === 'pro');
  const premiumTier = tiers?.find(t => t.tier === 'premium');

  const subscriptionInfo = useMemo(() => {
    if (!subscriptionEnd) return null;
    const endDate = new Date(subscriptionEnd);
    const now = new Date();
    const daysLeft = differenceInDays(endDate, now);
    const hoursLeft = differenceInHours(endDate, now);
    const totalDays = 30;
    const daysUsed = totalDays - daysLeft;
    const progressPercent = Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));
    return {
      endDate,
      daysLeft: Math.max(0, daysLeft),
      hoursLeft: Math.max(0, hoursLeft),
      progressPercent,
      formattedDate: format(endDate, 'MMMM d, yyyy'),
    };
  }, [subscriptionEnd]);

  const handleSubscribe = async (tier?: 'pro' | 'premium') => {
    if (!user) {
      navigate('/auth?redirect=/eclipse-plus');
      return;
    }
    setIsSubscribing(true);
    setError(null);
    try {
      await subscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start subscription');
      setIsSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    setError(null);
    try {
      await openCustomerPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open subscription management');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-8 max-w-5xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="font-semibold">Eclipse+ Membership</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            Unlock <span className="gradient-text">Premium Benefits</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. Save on every purchase, claim free products monthly, and get exclusive member perks.
          </p>

          {/* Savings Highlight */}
          {proTier && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Members save an average of <strong>£{(proTier.discount_percentage * 0.5).toFixed(0)}+</strong> per purchase</span>
            </div>
          )}
        </div>

        {/* Canceled / Error Notices */}
        {wasCanceled && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>Your checkout was canceled. No worries - you can subscribe whenever you're ready!</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Subscribed Status Card */}
        {isSubscribed && subscriptionInfo && (
          <Card className="relative overflow-hidden max-w-lg mx-auto ring-2 ring-border">
            <div className="absolute top-0 left-0 right-0 h-1 bg-border" />
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Crown className="h-8 w-8 text-foreground" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl">Eclipse+</CardTitle>
                <Badge className="bg-primary text-primary-foreground">Active</Badge>
              </div>
              <p className="text-muted-foreground mt-2">
                {ECLIPSE_PLUS_DISCOUNT}% off all purchases • Free products/month
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Billing cycle progress</span>
                  <span className="font-medium">{Math.round(subscriptionInfo.progressPercent)}%</span>
                </div>
                <Progress value={subscriptionInfo.progressPercent} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">
                    {subscriptionInfo.daysLeft > 0 ? subscriptionInfo.daysLeft : subscriptionInfo.hoursLeft}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {subscriptionInfo.daysLeft > 0 ? 'days remaining' : 'hours remaining'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-sm font-medium">{subscriptionInfo.formattedDate}</div>
                  <div className="text-xs text-muted-foreground">renewal date</div>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Gift className={cn("h-5 w-5", canClaimFree ? "text-foreground" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Monthly Free Products</div>
                    <div className="text-sm text-muted-foreground">
                      {freeProductsClaimed} claimed this month
                    </div>
                  </div>
                  {canClaimFree ? (
                    <Button asChild size="sm" className="gradient-button border-0">
                      <Link to="/products">Claim Now</Link>
                    </Button>
                  ) : (
                    <Badge variant="secondary">Claimed</Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full" onClick={handleManageSubscription} disabled={isOpeningPortal}>
                  {isOpeningPortal ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opening...</> : <><Crown className="h-4 w-4 mr-2" />Manage Subscription</>}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={handleManageSubscription} disabled={isOpeningPortal}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards for Non-Subscribers */}
        {!isSubscribed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Eclipse+ */}
            {proTier && (
              <Card className={cn(
                "relative overflow-hidden transition-all duration-200",
                selectedTier === 'pro' ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-primary/50"
              )}>
                <CardHeader className="text-center pb-4 pt-8">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Crown className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{proTier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{proTier.description}</p>
                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">£{proTier.monthly_price_gbp}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {proTier.annual_price_gbp > 0 && (
                      <p className="text-xs text-muted-foreground">
                        or £{proTier.annual_price_gbp}/year — save {calculateAnnualSavingsPercent(proTier.monthly_price_gbp, proTier.annual_price_gbp)}%
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-2.5">
                    {proTier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <Button className="w-full h-11 text-sm font-semibold" onClick={() => handleSubscribe('pro')} disabled={isSubscribing}>
                      {isSubscribing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : <><Crown className="h-4 w-4 mr-2" />Get Eclipse+</>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Eclipse+ Ultimate */}
            {premiumTier && (
              <Card className={cn(
                "relative overflow-hidden transition-all duration-200 border-amber-500/30",
                selectedTier === 'premium' ? "ring-2 ring-amber-500" : "ring-1 ring-amber-500/30 hover:ring-amber-500/60"
              )}>
                <div className="absolute top-0 left-0 right-0 bg-amber-500 text-background text-center text-xs py-1.5 font-bold uppercase tracking-wider">
                  Best Value
                </div>
                <CardHeader className="text-center pb-4 pt-10">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-amber-400" />
                  </div>
                  <CardTitle className="text-xl">{premiumTier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{premiumTier.description}</p>
                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-amber-400">£{premiumTier.monthly_price_gbp}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {premiumTier.annual_price_gbp > 0 && (
                      <p className="text-xs text-muted-foreground">
                        or £{premiumTier.annual_price_gbp}/year — save {calculateAnnualSavingsPercent(premiumTier.monthly_price_gbp, premiumTier.annual_price_gbp)}%
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-2.5">
                    {premiumTier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <Button className="w-full h-11 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-background border-0" onClick={() => handleSubscribe('premium')} disabled={isSubscribing}>
                      {isSubscribing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : <><Sparkles className="h-4 w-4 mr-2" />Get Ultimate</>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Comparison highlights */}
        {!isSubscribed && proTier && premiumTier && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-display font-bold text-center mb-6">Compare Plans</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Feature</th>
                    <th className="text-center p-3 font-semibold">{proTier.name}</th>
                    <th className="text-center p-3 font-semibold text-amber-400">{premiumTier.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">Discount</td>
                    <td className="p-3 text-center font-medium">{proTier.discount_percentage}%</td>
                    <td className="p-3 text-center font-medium text-amber-400">{premiumTier.discount_percentage}%</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">Free products/month</td>
                    <td className="p-3 text-center font-medium">{proTier.free_products_per_month}</td>
                    <td className="p-3 text-center font-medium text-amber-400">{premiumTier.free_products_per_month}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">Monthly price</td>
                    <td className="p-3 text-center font-medium">£{proTier.monthly_price_gbp}</td>
                    <td className="p-3 text-center font-medium text-amber-400">£{premiumTier.monthly_price_gbp}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">VIP Discord role</td>
                    <td className="p-3 text-center text-muted-foreground">—</td>
                    <td className="p-3 text-center"><Check className="h-4 w-4 text-amber-400 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-muted-foreground">Priority support</td>
                    <td className="p-3 text-center text-muted-foreground">—</td>
                    <td className="p-3 text-center"><Check className="h-4 w-4 text-amber-400 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-4 max-w-3xl mx-auto">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
