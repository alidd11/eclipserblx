import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crown, Check, Gift, Percent, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, ECLIPSE_PLUS_DISCOUNT, ECLIPSE_PLUS_BOT_DISCOUNT } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';

const features = [
  {
    icon: Gift,
    title: 'One Free Product Monthly',
    description: 'Choose any product (excluding bots) completely free every month. No restrictions on price.',
  },
  {
    icon: Percent,
    title: `${ECLIPSE_PLUS_DISCOUNT}% Off Products`,
    description: 'Save on every purchase you make. Discount automatically applies at checkout.',
  },
  {
    icon: Bot,
    title: `${ECLIPSE_PLUS_BOT_DISCOUNT}% Off Bots`,
    description: 'Even bigger savings on all bot products with your Eclipse+ membership.',
  },
  {
    icon: Sparkles,
    title: 'Exclusive Member Benefits',
    description: 'Early access to new products, priority support, and exclusive member-only content.',
  },
];

const faqs = [
  {
    question: 'What products can I get for free?',
    answer: 'You can claim any single product each month, except for bot products. There\'s no price limit - choose any eligible product regardless of its value.',
  },
  {
    question: 'What discounts do I get?',
    answer: `You get ${ECLIPSE_PLUS_DISCOUNT}% off all regular products and an even bigger ${ECLIPSE_PLUS_BOT_DISCOUNT}% off all bot products! Discounts are automatically applied at checkout when you're logged in.`,
  },
  {
    question: 'When does my free product refresh?',
    answer: 'Your free product claim resets on the 1st of each month at midnight UTC. Any unclaimed free product does not roll over.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'What happens to my free product if I cancel?',
    answer: 'Any products you\'ve already claimed are yours to keep forever. You just won\'t be able to claim new free products after your subscription ends.',
  },
];

export default function EclipsePlus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSubscribed, subscriptionEnd, isLoading, subscribe, openCustomerPortal } = useSubscription();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wasCanceled = searchParams.get('canceled') === 'true';

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
    } finally {
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">Eclipse+ Membership</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            Unlock <span className="gradient-text">Premium Benefits</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join Eclipse+ and enjoy a free product every month, {ECLIPSE_PLUS_DISCOUNT}% off all products, 
            and {ECLIPSE_PLUS_BOT_DISCOUNT}% off bots. The ultimate membership for our community.
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

        {/* Pricing Card */}
        <Card className={cn(
          "relative overflow-hidden max-w-md mx-auto",
          isSubscribed && "ring-2 ring-primary"
        )}>
          {isSubscribed && (
            <div className="absolute top-4 right-4 px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
              Your Plan
            </div>
          )}
          
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Crown className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Eclipse+</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">£4.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>1 free product every month (excluding bots)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>{ECLIPSE_PLUS_DISCOUNT}% off all products</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>{ECLIPSE_PLUS_BOT_DISCOUNT}% off all bot products</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Early access to new products</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Priority customer support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>

            {isLoading ? (
              <Button className="w-full" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </Button>
            ) : isSubscribed ? (
              <div className="space-y-3">
                <div className="text-center text-sm text-muted-foreground">
                  Renews on {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : 'N/A'}
                </div>
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
                    'Manage Subscription'
                  )}
                </Button>
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
                    Redirecting...
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

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

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
