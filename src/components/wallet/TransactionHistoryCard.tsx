import { 
  Wallet, CreditCard, Gift, Crown, ArrowUpRight, ArrowDownLeft, 
  Loader2, History 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { CreditTransaction } from '@/hooks/useCredits';

interface TransactionHistoryCardProps {
  transactions: CreditTransaction[];
  isLoading: boolean;
}

function getTransactionIcon(type: CreditTransaction['type']) {
  switch (type) {
    case 'purchase':
      return <CreditCard className="h-4 w-4" />;
    case 'gift':
      return <Gift className="h-4 w-4" />;
    case 'subscription_bonus':
      return <Crown className="h-4 w-4" />;
    case 'spend':
      return <ArrowUpRight className="h-4 w-4" />;
    case 'refund':
      return <ArrowDownLeft className="h-4 w-4" />;
    default:
      return <Wallet className="h-4 w-4" />;
  }
}

function getTransactionColor(type: CreditTransaction['type']) {
  switch (type) {
    case 'purchase':
    case 'gift':
    case 'subscription_bonus':
    case 'refund':
      return 'text-green-500';
    case 'spend':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

function getTransactionLabel(type: CreditTransaction['type']) {
  switch (type) {
    case 'purchase':
      return 'Purchased';
    case 'gift':
      return 'Gift';
    case 'subscription_bonus':
      return 'Bonus';
    case 'spend':
      return 'Spent';
    case 'refund':
      return 'Refund';
    default:
      return type;
  }
}

export function TransactionHistoryCard({ transactions, isLoading }: TransactionHistoryCardProps) {
  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-4 w-4" />
          History
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-1">
              {transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    tx.type === 'spend' ? "bg-red-500/10" : "bg-green-500/10"
                  )}>
                    <span className={getTransactionColor(tx.type)}>
                      {getTransactionIcon(tx.type)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate flex-1 min-w-0">
                        {tx.description || getTransactionLabel(tx.type)}
                      </span>
                      <Badge variant="secondary" className="text-[10px] shrink-0 hidden xs:inline-flex">
                        {getTransactionLabel(tx.type)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "font-semibold shrink-0 text-sm whitespace-nowrap",
                    getTransactionColor(tx.type)
                  )}>
                    {tx.type === 'spend' ? '-' : '+'}£{Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
