import { Wallet, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface WalletBalanceCardProps {
  balance: number;
  totalPurchased: number;
  totalGifted: number;
  totalSpent: number;
  isLoading: boolean;
}

export function WalletBalanceCard({ 
  balance, 
  totalPurchased, 
  totalGifted, 
  totalSpent, 
  isLoading 
}: WalletBalanceCardProps) {
  const { formatPrice } = useCurrency();
  return (
    <div className="border border-border rounded-xl overflow-hidden relative w-full max-w-full">
      <div className="absolute top-0 left-0 right-0 h-1 bg-border" />
      
      <div className="px-6 py-4 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Available Balance</span>
          </div>
        </div>
        <p className="text-4xl font-bold mt-2">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            formatPrice(balance)
          )}
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Purchased</div>
            <div className="font-semibold">{formatPrice(totalPurchased)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Gifted</div>
            <div className="font-semibold">{formatPrice(totalGifted)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Spent</div>
            <div className="font-semibold">{formatPrice(totalSpent)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}