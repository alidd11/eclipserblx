import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gift, 
  Crown, 
  Loader2,
  History,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useCredits, CreditTransaction } from '@/hooks/useCredits';
import { usePageTracking } from '@/hooks/usePageTracking';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 500;

const suggestedAmounts = [5, 10, 25, 50, 100];

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
      return 'Gift Received';
    case 'subscription_bonus':
      return 'Eclipse+ Bonus';
    case 'spend':
      return 'Spent';
    case 'refund':
      return 'Refunded';
    default:
      return type;
  }
}

export default function Credits() {
  usePageTracking({ pagePath: '/credits' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { 
    balance, 
    totalPurchased, 
    totalGifted, 
    totalSpent,
    eclipsePlusBonusClaimed,
    transactions, 
    isLoading, 
    purchaseCredits,
    fetchBalance 
  } = useCredits();
  
  const [customAmount, setCustomAmount] = useState<string>('10');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const wasSuccess = searchParams.get('success') === 'true';
  const wasCanceled = searchParams.get('canceled') === 'true';
  const purchasedAmount = searchParams.get('amount');

  useEffect(() => {
    if (wasSuccess && purchasedAmount) {
      toast.success(`Successfully added £${parseFloat(purchasedAmount).toFixed(2)} to your credit balance!`);
      fetchBalance();
      // Clean up URL
      navigate('/credits', { replace: true });
    } else if (wasCanceled) {
      toast.info('Credit purchase was canceled.');
      navigate('/credits', { replace: true });
    }
  }, [wasSuccess, wasCanceled, purchasedAmount, fetchBalance, navigate]);

  const handlePurchase = async (amount: number) => {
    if (!user) {
      navigate('/auth?redirect=/credits');
      return;
    }

    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      toast.error(`Amount must be between £${MIN_AMOUNT} and £${MAX_AMOUNT}`);
      return;
    }

    setIsPurchasing(true);
    try {
      await purchaseCredits(amount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start purchase');
      setIsPurchasing(false);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow valid numeric input
    const numValue = value.replace(/[^0-9.]/g, '');
    setCustomAmount(numValue);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign in to view your credits</h2>
              <p className="text-muted-foreground mb-4">
                Create an account or sign in to purchase and use store credits.
              </p>
              <Button onClick={() => navigate('/auth?redirect=/credits')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
            <span className="font-semibold">Store Credits</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-bold">
            Your <span className="gradient-text">Credit Balance</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Use credits to pay for products instantly. Credits never expire!
          </p>
        </div>

        {/* Balance Card */}
        <Card className="relative overflow-hidden ring-2 ring-primary/20">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
          
          <CardHeader className="text-center pb-2">
            <CardDescription>Available Balance</CardDescription>
            <CardTitle className="text-5xl font-bold">
              {isLoading ? (
                <Loader2 className="h-10 w-10 mx-auto animate-spin" />
              ) : (
                `£${balance.toFixed(2)}`
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">Purchased</div>
                <div className="font-semibold text-lg">£{totalPurchased.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">Gifted</div>
                <div className="font-semibold text-lg">£{totalGifted.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">Spent</div>
                <div className="font-semibold text-lg">£{totalSpent.toFixed(2)}</div>
              </div>
            </div>

            {/* Eclipse+ Bonus Banner */}
            {!eclipsePlusBonusClaimed && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Subscribe to Eclipse+ for £10 free credit!</div>
                    <div className="text-sm text-muted-foreground">
                      Plus 30% off all purchases and 1 free product monthly
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate('/eclipse-plus')}>
                    Learn More
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Credits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Credits
            </CardTitle>
            <CardDescription>
              Choose an amount or enter a custom value (£{MIN_AMOUNT} - £{MAX_AMOUNT})
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Quick amounts */}
            <div className="grid grid-cols-5 gap-2">
              {suggestedAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className={cn(
                    "h-14 text-lg font-semibold",
                    customAmount === amount.toString() && "ring-2 ring-primary"
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
              <Label htmlFor="custom-amount">Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  £
                </span>
                <Input
                  id="custom-amount"
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-7 text-lg"
                  placeholder="Enter amount"
                  disabled={isPurchasing}
                />
              </div>
            </div>

            {/* Purchase button */}
            <Button 
              className="w-full h-12 text-lg gradient-button border-0"
              onClick={() => handlePurchase(parseFloat(customAmount) || 0)}
              disabled={isPurchasing || !customAmount || parseFloat(customAmount) < MIN_AMOUNT}
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Add £{parseFloat(customAmount || '0').toFixed(2)} Credit
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Purchase credits to get started!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === 'spend' ? "bg-red-500/10" : "bg-green-500/10"
                      )}>
                        <span className={getTransactionColor(tx.type)}>
                          {getTransactionIcon(tx.type)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tx.description || getTransactionLabel(tx.type)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {getTransactionLabel(tx.type)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      
                      <div className={cn(
                        "font-semibold text-lg",
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
      </div>
    </MainLayout>
  );
}
