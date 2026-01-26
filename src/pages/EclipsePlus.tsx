import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Crown, Check, Gift, Percent, Sparkles, Loader2, AlertCircle, Calendar, Clock, XCircle, Star } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionTiers, TierData, BillingPeriod, SubscriptionTier } from '@/hooks/useSubscriptionTiers';
import { TierCard } from '@/components/subscription/TierCard';
import { BillingToggle } from '@/components/subscription/BillingToggle';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, format } from 'date-fns';

const faqs = [
  {
    question: 'What products can I get for free?',
    answer: 'You can claim products each month (number depends on your tier), except for bot products. There\'s no price limit - choose any eligible product regardless of its value.',
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can change your plan at any time. When upgrading, you\'ll get immediate access to higher benefits. When downgrading, changes take effect at the end of your billing cycle.',
  },
  {
    question: 'When does my free product refresh?',
    answer: 'Your free product claims reset on the 1st of each month at midnight UTC. Any unclaimed free products do not roll over.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'What happens if I switch to annual billing?',
    answer: 'You\'ll save significantly compared to monthly billing (roughly 2 months free). Your benefits continue uninterrupted.',
  },
];

const tierIcons: Record<SubscriptionTier, typeof Crown> = {
  basic: Star,
  pro: Crown,
  premium: Sparkles,
};

export default function EclipsePlus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    isSubscribed, 
    subscriptionEnd, 
    tier: currentTier,
    billingPeriod: currentBillingPeriod,
    discountPercent,
    freeProductsPerMonth,
    freeProductsClaimed,
    canClaimFree, 
    isLoading, 
    subscribe, 
    openCustomerPortal 
  } = useSubscription();
  
  const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wasCanceled = searchParams.get('canceled') === 'true';

  // Calculate days remaining
  const subscriptionInfo = useMemo(() => {
    if (!subscriptionEnd) return null;
    
    const endDate = new Date(subscriptionEnd);
    const now = new Date();
    const daysLeft = differenceInDays(endDate, now);
    const hoursLeft = differenceInHours(endDate, now);
    
    // Calculate progress based on billing period
    const totalDays = currentBillingPeriod === 'annual' ? 365 : 30;
    const daysUsed = totalDays - daysLeft;
    const progressPercent = Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));
    
    return {
      endDate,
      daysLeft: Math.max(0, daysLeft),
      hoursLeft: Math.max(0, hoursLeft),
      progressPercent,
      formattedDate: format(endDate, 'MMMM d, yyyy'),
    };
  }, [subscriptionEnd, currentBillingPeriod]);

  const handleSelectTier = async (tier: TierData) => {
    if (!user) {
      navigate('/auth?redirect=/eclipse-plus');
      return;
    }

    setIsSubscribing(true);
    setError(null);
    
    try {
      await subscribe(tier.tier, billingPeriod);
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

  const CurrentTierIcon = currentTier ? tierIcons[currentTier] : Crown;

  return (
    <MainLayout>
      <div className="container py-8 max-w-6xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">Eclipse+ Membership</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            Choose Your <span className="gradient-text">Perfect Plan</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock exclusive discounts, free products, and premium benefits. 
            Save more with annual billing.
          </p>
        </div>

        {/* Canceled Notice */}
        {wasCanceled && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>Your checkout was canceled. No worries - you can subscribe whenever you're ready!</p>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Subscribed Status Card */}
        {isSubscribed && subscriptionInfo && (
          <Card className="relative overflow-hidden max-w-lg mx-auto ring-2 ring-primary">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
            
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <CurrentTierIcon className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl capitalize">Eclipse {currentTier || 'Plus'}</CardTitle>
                <Badge className="bg-primary text-primary-foreground capitalize">{currentBillingPeriod}</Badge>
              </div>
              <p className="text-muted-foreground mt-2">
                {discountPercent}% off all purchases • {freeProductsPerMonth} free product{freeProductsPerMonth !== 1 ? 's' : ''}/month
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Subscription Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Billing cycle progress</span>
                  <span className="font-medium">{Math.round(subscriptionInfo.progressPercent)}%</span>
                </div>
                <Progress value={subscriptionInfo.progressPercent} className="h-2" />
              </div>

              {/* Time Remaining */}
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

              {/* Free Product Status */}
              {freeProductsPerMonth > 0 && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      canClaimFree ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Gift className={cn("h-5 w-5", canClaimFree ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Monthly Free Products</div>
                      <div className="text-sm text-muted-foreground">
                        {freeProductsClaimed} of {freeProductsPerMonth} claimed
                      </div>
                    </div>
                    {canClaimFree ? (
                      <Button asChild size="sm" className="gradient-button border-0">
                        <Link to="/products">Claim Now</Link>
                      </Button>
                    ) : (
                      <Badge variant="secondary">All Claimed</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                >
                  {isOpeningPortal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards for Non-Subscribers */}
        {!isSubscribed && (
          <div className="space-y-8">
            {/* Billing Toggle */}
            <BillingToggle 
              billingPeriod={billingPeriod} 
              onChange={setBillingPeriod}
              annualSavingsPercent={17}
            />
            
            {/* Tier Cards */}
            {tiersLoading || isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {tiers?.map((tier) => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    billingPeriod={billingPeriod}
                    isCurrentTier={currentTier === tier.tier}
                    isLoading={isSubscribing}
                    onSelect={handleSelectTier}
                  />
                ))}
              </div>
            )}
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
