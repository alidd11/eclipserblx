import { useState } from 'react';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatGBP } from '@/lib/formatters';

const MIN_AMOUNT = 5;
const MAX_AMOUNT = 500;
const suggestedAmounts = [5, 10, 25, 50, 100];

interface AddCreditsCardProps {
  onPurchase: (amount: number) => void;
  isLoggedIn: boolean;
  onLoginRedirect: () => void;
  isPurchasing?: boolean;
}

export function AddCreditsCard({ onPurchase, isLoggedIn, onLoginRedirect, isPurchasing = false }: AddCreditsCardProps) {
  const [customAmount, setCustomAmount] = useState<string>('5');

  const handlePurchase = (amount: number) => {
    if (!isLoggedIn) {
      onLoginRedirect();
      return;
    }

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      toast.error(`Amount must be between £${MIN_AMOUNT} and £${MAX_AMOUNT}`);
      return;
    }

    onPurchase(amount);
  };

  const handleCustomAmountChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '');
    setCustomAmount(numValue);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden max-w-full">
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Credits
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          £{MIN_AMOUNT} - £{MAX_AMOUNT}
        </p>
      </div>
      
      <div className="p-6 space-y-4">
        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2">
          {suggestedAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-4 font-medium",
                customAmount === amount.toString() && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => setCustomAmount(amount.toString())}
              disabled={isPurchasing}
            >
              £{amount}
            </Button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <Label htmlFor="custom-amount" className="text-sm">Custom Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              £
            </span>
            <Input
              id="custom-amount"
              type="text"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="pl-7"
              placeholder="Enter amount"
              disabled={isPurchasing}
            />
          </div>
        </div>

        {/* Purchase button */}
        <Button 
          className="w-full"
          onClick={() => handlePurchase(parseFloat(customAmount) || 0)}
          disabled={isPurchasing || !customAmount || parseFloat(customAmount) < MIN_AMOUNT}
        >
          {isPurchasing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Add {formatGBP(parseFloat(customAmount || '0'))}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}