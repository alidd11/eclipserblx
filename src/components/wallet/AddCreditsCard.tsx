import { useState } from 'react';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 500;
const suggestedAmounts = [5, 10, 25, 50, 100];

interface AddCreditsCardProps {
  onPurchase: (amount: number) => Promise<void>;
  isLoggedIn: boolean;
  onLoginRedirect: () => void;
}

export function AddCreditsCard({ onPurchase, isLoggedIn, onLoginRedirect }: AddCreditsCardProps) {
  const [customAmount, setCustomAmount] = useState<string>('10');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (amount: number) => {
    if (!isLoggedIn) {
      onLoginRedirect();
      return;
    }

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      toast.error(`Amount must be between £${MIN_AMOUNT} and £${MAX_AMOUNT}`);
      return;
    }

    setIsPurchasing(true);
    try {
      await onPurchase(amount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start purchase');
      setIsPurchasing(false);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '');
    setCustomAmount(numValue);
  };

  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-4 w-4" />
          Add Credits
        </CardTitle>
        <CardDescription className="text-sm">
          £{MIN_AMOUNT} - £{MAX_AMOUNT}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
          className="w-full gradient-button border-0"
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
              Add £{parseFloat(customAmount || '0').toFixed(2)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
