import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, Check, X, Zap, Shield, Image, FileText, Megaphone, 
  Star, Package, Percent, Calendar, Loader2, ExternalLink,
  Palette, Link2, BarChart3, Tag, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSellerSubscription, SellerBillingPeriod } from '@/hooks/useSellerSubscription';
import { toast } from 'sonner';
import { format } from 'date-fns';

const comparisonRows = [
  { label: 'Commission rate', free: '15%', pro: '10%', icon: Percent },
  { label: 'Max file size', free: '200 MB', pro: '500 MB', icon: FileText },
  { label: 'Product images', free: '5', pro: '15', icon: Image },
  { label: 'Product listings', free: '25', pro: 'Unlimited', icon: Package },
  { label: 'Custom store pages', free: '1', pro: '5', icon: FileText },
  { label: 'Monthly ad credit', free: '\u2014', pro: '\u00A35', icon: Megaphone },
  { label: 'Store themes', free: 'Default', pro: 'All themes', icon: Palette },
  { label: 'Custom nav links', free: '2', pro: '10', icon: Link2 },
  { label: 'Announcement bar', free: false, pro: true, icon: Megaphone },
  { label: 'Analytics', free: '30 days', pro: '90 days + export', icon: BarChart3 },
  { label: 'Discount codes', free: '1 active', pro: 'Unlimited', icon: Tag },
  { label: 'Scheduled banner', free: false, pro: true, icon: Clock },
  { label: 'PRO badge on store', free: false, pro: true, icon: Shield },
  { label: 'Priority product review', free: false, pro: true, icon: Zap },
  { label: 'Advanced analytics', free: false, pro: true, icon: Star },
];

export default function SellerProPage() {
  const [searchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<SellerBillingPeriod>('monthly');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { isPro, subscriptionEnd, isLoading, subscribe, openPortal, prices } = useSellerSubscription();

  const isSuccess = searchParams.get('subscription') === 'success';

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      await subscribe(billingPeriod);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleManage = async () => {
    try {
      await openPortal();
    } catch {
      toast.error('Failed to open subscription management');
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        {isSuccess && (
          <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-500">Welcome to Eclipse Pro!</p>
              <p className="text-sm text-muted-foreground">Your subscription is now active. Enjoy your upgraded seller experience.</p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Eclipse Pro</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Supercharge Your Store</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Lower commission, higher limits, and professional tools to grow your business on Eclipse.
          </p>
        </div>

        {isPro && subscriptionEnd && (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Eclipse Pro Active</h3>
                      <Badge className="bg-primary text-primary-foreground">PRO</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Renews {format(new Date(subscriptionEnd), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleManage}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isPro && (
          <div className="flex justify-center mb-8">
            <div className="bg-muted rounded-lg p-1 flex items-center gap-1">
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  billingPeriod === 'monthly' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monthly
              </button>
              <button
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  billingPeriod === 'annual' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setBillingPeriod('annual')}
              >
                Annual
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Save {prices.annualSavingsPercent}%</Badge>
              </button>
            </div>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader className="pb-0">
            <div className="grid grid-cols-3 gap-4">
              <div />
              <div className="text-center">
                <CardTitle className="text-base">Free</CardTitle>
                <p className="text-sm text-muted-foreground">Current plan</p>
              </div>
              <div className="text-center">
                <CardTitle className="text-base flex items-center justify-center gap-1.5">
                  <Crown className="h-4 w-4 text-primary" />
                  Eclipse Pro
                </CardTitle>
                <p className="text-sm font-semibold text-primary">
                  {'\u00A3'}{billingPeriod === 'monthly' ? prices.monthly : (prices.annual / 12).toFixed(2)}/mo
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="divide-y divide-border">
              {comparisonRows.map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-4 py-3 items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <row.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{row.label}</span>
                  </div>
                  <div className="text-center text-sm">
                    {typeof row.free === 'boolean' ? (
                      row.free ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground">{row.free}</span>
                    )}
                  </div>
                  <div className="text-center text-sm">
                    {typeof row.pro === 'boolean' ? (
                      row.pro ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                      )
                    ) : (
                      <span className="font-medium">{row.pro}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!isPro && (
          <div className="text-center">
            <Button
              size="lg"
              className="min-w-[200px]"
              onClick={handleSubscribe}
              disabled={isSubscribing || isLoading}
            >
              {isSubscribing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Subscribe {'\u2014'} {'\u00A3'}{billingPeriod === 'monthly' ? prices.monthly : prices.annual}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </>
              )}
            </Button>
            {billingPeriod === 'annual' && (
              <p className="text-xs text-muted-foreground mt-2">
                Billed annually at {'\u00A3'}{prices.annual}. Save {prices.annualSavingsPercent}% vs monthly.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Cancel anytime. No long-term commitment.</p>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
