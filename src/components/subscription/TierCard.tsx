import { Crown, Check, Sparkles, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TierData, BillingPeriod, calculateAnnualSavingsPercent } from '@/hooks/useSubscriptionTiers';

interface TierCardProps {
  tier: TierData;
  billingPeriod: BillingPeriod;
  isCurrentTier?: boolean;
  isLoading?: boolean;
  onSelect: (tier: TierData) => void;
}

const tierIcons: Record<string, typeof Crown> = {
  basic: Star,
  pro: Crown,
  premium: Sparkles,
};

const tierColors: Record<string, string> = {
  basic: 'from-blue-500 to-blue-600',
  pro: 'from-primary to-primary/80',
  premium: 'from-amber-500 to-orange-500',
};

export function TierCard({ tier, billingPeriod, isCurrentTier, isLoading, onSelect }: TierCardProps) {
  const Icon = tierIcons[tier.tier] || Crown;
  const gradientClass = tierColors[tier.tier] || tierColors.pro;
  const isPro = tier.tier === 'pro';
  
  const price = billingPeriod === 'monthly' ? tier.monthly_price_gbp : tier.annual_price_gbp;
  const monthlyEquivalent = billingPeriod === 'annual' ? tier.annual_price_gbp / 12 : tier.monthly_price_gbp;
  const savingsPercent = calculateAnnualSavingsPercent(tier.monthly_price_gbp, tier.annual_price_gbp);

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-lg",
      isPro && "ring-2 ring-primary scale-[1.02]",
      isCurrentTier && "ring-2 ring-primary bg-primary/5"
    )}>
      {isPro && (
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center text-xs py-1 font-medium">
          Most Popular
        </div>
      )}
      
      <CardHeader className={cn("text-center pb-4", isPro && "pt-8")}>
        <div className={cn(
          "w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br flex items-center justify-center",
          gradientClass
        )}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        
        {tier.description && (
          <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
        )}
        
        <div className="mt-4 space-y-1">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">£{monthlyEquivalent.toFixed(2)}</span>
            <span className="text-muted-foreground">/mo</span>
          </div>
          
          {billingPeriod === 'annual' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                £{price.toFixed(2)} billed annually
              </p>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                Save {savingsPercent}%
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Highlights */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{tier.discount_percentage}%</div>
            <div className="text-xs text-muted-foreground">Discount</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{tier.free_products_per_month}</div>
            <div className="text-xs text-muted-foreground">Free/mo</div>
          </div>
        </div>
        
        {/* Features */}
        <ul className="space-y-2">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        {isCurrentTier ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="h-4 w-4 mr-2" />
            Current Plan
          </Button>
        ) : (
          <Button 
            className={cn(
              "w-full",
              isPro && "gradient-button border-0"
            )}
            variant={isPro ? "default" : "outline"}
            onClick={() => onSelect(tier)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Select Plan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
