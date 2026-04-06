import { useState, useMemo } from 'react';
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
 
 // Platform commission — flat percentage on sale price
 // Platform absorbs all payment processing fees
 const platformCommission = price * (commissionRate / 100);
 
 // Seller earnings — always exactly (100% - commission%) of sale price
 const sellerEarnings = Math.max(0, price - platformCommission);
 
 // Effective percentage
 const effectivePercentage = price > 0 ? (sellerEarnings / price) * 100 : 0;
 
 return {
 productPrice: price,
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
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Calculator className="h-5 w-5" />
 Earnings Calculator
 </h3>
 <p className="text-sm text-muted-foreground">
 See how much you'll earn per sale after all fees
 </p>
 </div>
 <div className="p-4 space-y-6">
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

 {/* Platform Commission */}
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground flex items-center gap-1">
 Platform commission ({commissionRate}%)
 <Tooltip>
 <TooltipTrigger>
 <Info className="h-3 w-3" />
 </TooltipTrigger>
 <TooltipContent>
 <p>Flat {commissionRate}% fee — we absorb all payment processing costs</p>
 </TooltipContent>
 </Tooltip>
 </span>
 <span className="text-destructive">-{formatCurrency(breakdown.platformCommission)}</span>
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
 Your Earnings = Sale Price × (1 - {commissionRate}%)
 </code>
 <p className="mt-2">
 Eclipse absorbs all payment processing fees (Stripe, PayPal, etc.).
 You always earn exactly {100 - commissionRate}% of your listed price — simple and transparent.
 </p>
 </div>
 </div>
 </div>
 );
}
