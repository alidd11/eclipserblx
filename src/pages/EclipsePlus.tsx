import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Crown, Check, Gift, Percent, Loader2, AlertCircle, Calendar, Clock, XCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, ECLIPSE_PLUS_DISCOUNT } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { usePageTracking } from '@/hooks/usePageTracking';

const faqs = [
  {
    question: 'What products can I get for free?',
    answer: 'You can claim 1 product each month, except for bot products. There\'s no price limit - choose any eligible product regardless of its value.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'When does my free product refresh?',
    answer: 'Your free product claim resets on the 1st of each month at midnight UTC. Unclaimed free products do not roll over.',
  },
  {
    question: 'Does the discount apply to everything?',
    answer: 'The 30% discount applies to all products except those in the Eclipse Savers category and resellable products. Bot products get an additional 5% (35% total).',
  },
];

const benefits = [
  { icon: Percent, title: '30% Off Everything', description: 'Save on all purchases (35% on bots)' },
  { icon: Gift, title: '1 Free Product Monthly', description: 'Claim any eligible product for free' },
  { icon: Crown, title: 'Priority Support', description: 'Get help faster from our team' },
];

export default function EclipsePlus() {
  usePageTracking({ pagePath: '/eclipse-plus' });
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
    
    // Calculate progress based on 30-day billing period
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

  const handleSubscribe = async () => {
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
      <div className="container py-8 max-w-4xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">Eclipse+ Membership</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            Unlock <span className="gradient-text">Premium Benefits</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join Eclipse+ and enjoy exclusive discounts, free products every month, and priority support.
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
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl">Eclipse+</CardTitle>
                <Badge className="bg-primary text-primary-foreground">Active</Badge>
              </div>
              <p className="text-muted-foreground mt-2">
                {ECLIPSE_PLUS_DISCOUNT}% off all purchases • 1 free product/month
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
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    canClaimFree ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Gift className={cn("h-5 w-5", canClaimFree ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Monthly Free Product</div>
                    <div className="text-sm text-muted-foreground">
                      {freeProductsClaimed} of 1 claimed
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

        {/* Pricing Card for Non-Subscribers */}
        {!isSubscribed && (
          <Card className="relative overflow-hidden max-w-lg mx-auto ring-2 ring-primary">
            <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-sm py-2 font-medium">
              Most Popular Choice
            </div>
            
            <CardHeader className="text-center pt-12 pb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              
              <CardTitle className="text-2xl">Eclipse+</CardTitle>
              
              <div className="mt-4 space-y-1">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">£3.99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Benefits Grid */}
              <div className="grid gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit.title} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{benefit.title}</div>
                      <div className="text-sm text-muted-foreground">{benefit.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Feature List */}
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Early access to new products</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Exclusive member-only deals</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Cancel anytime, no commitment</span>
                </li>
              </ul>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Button 
                  className="w-full gradient-button border-0 h-12 text-lg"
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
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
