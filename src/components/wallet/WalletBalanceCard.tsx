import { Wallet, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  return (
    <Card className="relative overflow-hidden w-full max-w-full">
      <div className="absolute top-0 left-0 right-0 h-1 bg-border" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-foreground" />
            <CardDescription className="font-medium">Available Balance</CardDescription>
          </div>
        </div>
        <CardTitle className="text-4xl font-bold mt-2">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            `£${balance.toFixed(2)}`
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Purchased</div>
            <div className="font-semibold">£{totalPurchased.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Gifted</div>
            <div className="font-semibold">£{totalGifted.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 text-center">
            <div className="text-muted-foreground text-xs">Spent</div>
            <div className="font-semibold">£{totalSpent.toFixed(2)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
