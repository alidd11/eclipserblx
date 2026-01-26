import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BillingPeriod } from '@/hooks/useSubscriptionTiers';

interface BillingToggleProps {
  billingPeriod: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
  annualSavingsPercent?: number;
}

export function BillingToggle({ billingPeriod, onChange, annualSavingsPercent = 17 }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => onChange('monthly')}
        className={cn(
          "px-4 py-2 rounded-lg font-medium transition-colors",
          billingPeriod === 'monthly' 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Monthly
      </button>
      
      <button
        onClick={() => onChange('annual')}
        className={cn(
          "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
          billingPeriod === 'annual' 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Annual
        {billingPeriod !== 'annual' && (
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
            Save ~{annualSavingsPercent}%
          </Badge>
        )}
      </button>
    </div>
  );
}
