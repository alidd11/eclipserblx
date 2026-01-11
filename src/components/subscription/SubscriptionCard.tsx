import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Loader2, Gift, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription, ECLIPSE_PLUS_DISCOUNT } from '@/hooks/useSubscription';

export function SubscriptionCard() {
  const { 
    isSubscribed, 
    subscriptionEnd, 
    canClaimFree, 
    claimedThisMonth,
    isLoading, 
    subscribe, 
    openCustomerPortal 
  } = useSubscription();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      await subscribe();
    } catch (error) {
      console.error('Subscription error:', error);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Portal error:', error);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Eclipse+ Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isSubscribed) {
    return (
      <Card className="ring-1 ring-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Eclipse+ Membership
            </CardTitle>
            <Badge variant="default" className="bg-primary">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Renews:</span>
              <span className="font-medium">
                {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Free product:</span>
              <span className="font-medium">
                {claimedThisMonth ? 'Claimed' : 'Available'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {canClaimFree && (
              <Button asChild className="gradient-button border-0 flex-1">
                <Link to="/products">
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Free Product
                </Link>
              </Button>
            )}
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleManageSubscription}
              disabled={isOpeningPortal}
            >
              {isOpeningPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Eclipse+ Membership
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Join Eclipse+ for just £4.99/month and get 1 free product monthly plus {ECLIPSE_PLUS_DISCOUNT}% off all purchases (excluding bots).
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="gradient-button border-0 flex-1"
            onClick={handleSubscribe}
            disabled={isSubscribing}
          >
            {isSubscribing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Subscribe Now
              </>
            )}
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/eclipse-plus">Learn More</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
