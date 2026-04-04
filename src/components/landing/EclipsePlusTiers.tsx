import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Crown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { Skeleton } from '@/components/ui/skeleton';

export function EclipsePlusTiers() {
  const { data: tiers, isLoading } = useSubscriptionTiers();

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </section>
    );
  }

  const proTier = tiers?.find(t => t.tier === 'pro');
  const premiumTier = tiers?.find(t => t.tier === 'premium');

  if (!proTier && !premiumTier) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-lg font-bold tracking-tight uppercase">Eclipse+ Memberships</h2>
          </div>
          <Link to="/eclipse-plus" className="text-xs text-primary hover:underline flex items-center gap-1">
            Learn more <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Eclipse+ (Pro tier) */}
          {proTier && (
            <Link to="/eclipse-plus" className="block group">
              <div className="relative rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 transition-all duration-200 h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{proTier.name}</h3>
                      <p className="text-[10px] text-muted-foreground">For regular shoppers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">£{proTier.monthly_price_gbp}</span>
                    <span className="text-[10px] text-muted-foreground">/mo</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    {proTier.discount_percentage}% off all purchases
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    {proTier.free_products_per_month} free product per month
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                    Early access to new products
                  </li>
                </ul>

                <Button size="sm" variant="outline" className="w-full h-8 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Get Eclipse+
                </Button>
              </div>
            </Link>
          )}

          {/* Eclipse+ Ultimate (Premium tier) */}
          {premiumTier && (
            <Link to="/eclipse-plus" className="block group">
              <div className="relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4 sm:p-5 hover:border-amber-500/50 transition-all duration-200 h-full">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-500 text-background text-[9px] font-bold uppercase rounded-bl-lg rounded-tr-xl">
                  Best Value
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{premiumTier.name}</h3>
                      <p className="text-[10px] text-muted-foreground">For power creators</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-amber-400">£{premiumTier.monthly_price_gbp}</span>
                    <span className="text-[10px] text-muted-foreground">/mo</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    {premiumTier.discount_percentage}% off all purchases
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    {premiumTier.free_products_per_month} free products per month
                  </li>
                  <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    VIP Discord role & priority support
                  </li>
                </ul>

                <Button size="sm" className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-background border-0">
                  Get Ultimate
                </Button>
              </div>
            </Link>
          )}
        </div>
      </ScrollReveal>
    </section>
  );
}
