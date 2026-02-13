import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { usePageTracking } from '@/hooks/usePageTracking';
import { toast } from 'sonner';

// Wallet components
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { AddCreditsCard } from '@/components/wallet/AddCreditsCard';
import { TransactionHistoryCard } from '@/components/wallet/TransactionHistoryCard';
import { EclipsePlusBanner } from '@/components/wallet/EclipsePlusBanner';
import { MyPaymentsCard } from '@/components/wallet/MyPaymentsCard';

// Embedded payment
import { EmbeddedPaymentModal } from '@/components/payments/EmbeddedPaymentModal';

export default function Credits() {
  usePageTracking({ pagePath: '/credits' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Embedded payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  
  const { 
    balance, 
    totalPurchased, 
    totalGifted, 
    totalSpent,
    eclipsePlusBonusClaimed,
    transactions, 
    isLoading, 
    fetchBalance 
  } = useCredits();

  const wasSuccess = searchParams.get('success') === 'true';
  const wasCanceled = searchParams.get('canceled') === 'true';
  const purchasedAmount = searchParams.get('amount');

  useEffect(() => {
    if (wasSuccess && purchasedAmount) {
      toast.success(`Successfully added £${parseFloat(purchasedAmount).toFixed(2)} to your wallet!`);
      fetchBalance();
      navigate('/credits', { replace: true });
    } else if (wasCanceled) {
      toast.info('Credit purchase was canceled.');
      navigate('/credits', { replace: true });
    }
  }, [wasSuccess, wasCanceled, purchasedAmount, fetchBalance, navigate]);

  const handlePurchaseCredits = (amount: number) => {
    setCreditAmount(amount);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    toast.success(`Successfully added £${creditAmount.toFixed(2)} to your wallet!`);
    fetchBalance();
    setPaymentModalOpen(false);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  // Not logged in state
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-lg">
          <Card className="text-center py-10">
            <CardContent>
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign in to view your wallet</h2>
              <p className="text-muted-foreground mb-4 text-sm">
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
      <div
        className="px-4 sm:px-6 py-6 mx-auto w-full max-w-2xl space-y-6 box-border"
        style={{ 
          paddingRight: 'max(1rem, calc(env(safe-area-inset-right) + 1rem))',
          maxWidth: 'min(42rem, 100vw - 2rem)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Wallet className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your store credits</p>
          </div>
        </div>

        {/* Balance Card - Always visible */}
        <WalletBalanceCard
          balance={balance}
          totalPurchased={totalPurchased}
          totalGifted={totalGifted}
          totalSpent={totalSpent}
          isLoading={isLoading}
        />

        {/* Eclipse+ Banner */}
        <EclipsePlusBanner show={!eclipsePlusBonusClaimed} />

        {/* Two column layout for Add Credits & History */}
        <div className="grid md:grid-cols-2 gap-6">
          <AddCreditsCard
            onPurchase={handlePurchaseCredits}
            isLoggedIn={!!user}
            onLoginRedirect={() => navigate('/auth?redirect=/credits')}
          />
          
          <TransactionHistoryCard
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>

        {/* Developer Payments - only shows if user has payments */}
        <MyPaymentsCard />
      </div>

      {/* Embedded Payment Modal */}
      <EmbeddedPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        paymentType="credits"
        amount={creditAmount}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </MainLayout>
  );
}
