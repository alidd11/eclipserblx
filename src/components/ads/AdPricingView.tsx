import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, ImageIcon, AlertCircle, Crown, Zap, Star, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdTier, AdBillingPeriod, calculateAdAnnualSavingsPercent } from '@/hooks/useAdSubscription';
import { EmbeddedPaymentModal } from '@/components/payments/EmbeddedPaymentModal';

const formatCurrency = (amount: number) =>
 new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const formatRobux = (amount: number) =>
 new Intl.NumberFormat('en-US').format(amount) + ' R$';

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

interface AdPricingViewProps {
 tiers: any[] | undefined;
 isLoading: boolean;
 billingPeriod: AdBillingPeriod;
 setBillingPeriod: (period: AdBillingPeriod) => void;
 robuxPrices?: Record<string, number>;
 user: any;
 hasDiscordLinked: boolean;
 profileLoading: boolean;
 authLoading: boolean;
 checkoutMutation: any;
 onSubscribe: (tier: AdTier) => void;
}

export function AdPricingView({
 tiers,
 isLoading,
 billingPeriod,
 setBillingPeriod,
 robuxPrices,
 user,
 hasDiscordLinked,
 profileLoading,
 authLoading,
 checkoutMutation,
 onSubscribe,
}: AdPricingViewProps) {
 return (
 <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
 {/* Hero Section */}
 <div className="text-center space-y-4">
 <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
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
 <div className="border border-border rounded-xl overflow-hidden" key={tier.id}
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
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 {tierIcons[tier.tier]}
 <h3 className="font-semibold text-sm">{tier.name}</h3>
 </div>
 <p className="text-sm text-muted-foreground">{tier.description}</p>
 </div>
 <div className="p-4 space-y-6">
 <div>
 {billingPeriod === 'annual' ? (
 <>
 <div className="flex items-baseline gap-1">
 <span className="text-3xl font-bold">{formatCurrency(tier.annual_price_gbp / 12)}</span>
 <span className="text-muted-foreground">/month</span>
 </div>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-sm text-muted-foreground line-through">{formatCurrency(tier.monthly_price_gbp)}/mo</span>
 {savingsPercent > 0 && (
 <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0">Save {savingsPercent}%</Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground mt-2">{formatCurrency(tier.annual_price_gbp)} billed annually</p>
 </>
 ) : (
 <div className="flex items-baseline gap-1">
 <span className="text-3xl font-bold">{formatCurrency(price)}</span>
 <span className="text-muted-foreground">/month</span>
 </div>
 )}
 {robuxPrices?.[tier.tier] && robuxPrices[tier.tier] > 0 && (
 <div className="mt-3 pt-3 border-t border-border/50">
 <div className="flex items-center gap-2 text-sm">
 <span className="text-muted-foreground">or</span>
 <span className="font-bold text-green-500">{formatRobux(robuxPrices[tier.tier])}</span>
 </div>
 </div>
 )}
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-sm">
 <ImageIcon className="h-4 w-4 text-primary shrink-0" />
 <span className="font-medium">Up to {tier.max_images} images per ad</span>
 </div>
 {tier.features.map((feature: string, index: number) => (
 <div key={index} className="flex items-center gap-2 text-sm">
 <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
 <span>{feature}</span>
 </div>
 ))}
 </div>
 <Button
 className="w-full"
 variant={tier.tier === 'pro' ? 'default' : 'outline'}
 onClick={() => onSubscribe(tier.tier)}
 disabled={checkoutMutation.isPending || !user || (user && !hasDiscordLinked)}
 >
 {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
 {!user ? 'Sign in to Subscribe' : !hasDiscordLinked ? 'Link Discord to Subscribe' : 'Subscribe'}
 </Button>
 </div>
 </div>
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
 );
}
