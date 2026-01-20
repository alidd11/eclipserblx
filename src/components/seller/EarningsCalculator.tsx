import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EarningsCalculatorProps {
  commissionRate?: number; // As percentage (e.g., 15 for 15%)
}

export function EarningsCalculator({ commissionRate = 15 }: EarningsCalculatorProps) {
  const [productPrice, setProductPrice] = useState<string>('10.00');

  const breakdown = useMemo(() => {
    const price = parseFloat(productPrice) || 0;
    
    // Estimate Stripe fee: 2.9% + £0.30 for UK
    const stripeFeePercentage = 0.029;
    const stripeFeeFixed = 0.30;
    const stripeFee = (price * stripeFeePercentage) + stripeFeeFixed;
    
    // Net after Stripe
    const netAfterStripe = Math.max(0, price - stripeFee);
    
    // Platform commission on net
    const platformCommission = netAfterStripe * (commissionRate / 100);
    
    // Seller earnings
    const sellerEarnings = Math.max(0, netAfterStripe - platformCommission);
    
    // Effective percentage
    const effectivePercentage = price > 0 ? (sellerEarnings / price) * 100 : 0;
    
    return {
      productPrice: price,
      stripeFee,
      netAfterStripe,
      platformCommission,
      sellerEarnings,
      effectivePercentage,
    };
  }, [productPrice, commissionRate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Earnings Calculator
        </CardTitle>
        <CardDescription>
          See how much you'll earn per sale after all fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Input */}
        <div className="space-y-2">
          <Label htmlFor="product-price">Product Price (£)</Label>
          <Input
            id="product-price"
            type="number"
            step="0.01"
            min="0"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            className="text-lg font-mono"
          />
        </div>

        {/* Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          {/* Sale Price */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Customer pays</span>
            <span className="font-medium">{formatCurrency(breakdown.productPrice)}</span>
          </div>

          {/* Stripe Fee */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Stripe processing fee
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stripe charges 2.9% + £0.30 per transaction</p>
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="text-red-500">-{formatCurrency(breakdown.stripeFee)}</span>
          </div>

          {/* Net After Stripe */}
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="text-muted-foreground">Net after payment processing</span>
            <span className="font-medium">{formatCurrency(breakdown.netAfterStripe)}</span>
          </div>

          {/* Platform Commission */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Platform commission ({commissionRate}%)
            </span>
            <span className="text-red-500">-{formatCurrency(breakdown.platformCommission)}</span>
          </div>

          {/* Seller Earnings */}
          <div className="flex justify-between border-t-2 border-primary pt-3">
            <span className="font-semibold">Your earnings</span>
            <div className="text-right">
              <span className="text-xl font-bold text-green-600">
                {formatCurrency(breakdown.sellerEarnings)}
              </span>
              <p className="text-xs text-muted-foreground">
                ({breakdown.effectivePercentage.toFixed(1)}% of sale)
              </p>
            </div>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-3">
          <p className="font-medium mb-1">How it's calculated:</p>
          <code className="text-[10px] block">
            Your Earnings = (Sale Price - Stripe Fee) × (1 - Commission Rate)
          </code>
          <p className="mt-2">
            Stripe fees are deducted first, then the platform commission is applied to the remaining amount.
            This ensures transparent and fair earnings calculation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
