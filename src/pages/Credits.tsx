import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';
import { AccountPageLayout } from '@/components/account/AccountPageLayout';
import { MainLayout } from '@/components/layout/MainLayout';

// Wallet components
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { AddCreditsCard } from '@/components/wallet/AddCreditsCard';
import { TransactionHistoryCard } from '@/components/wallet/TransactionHistoryCard';

import { MyPaymentsCard } from '@/components/wallet/MyPaymentsCard';

// Embedded payment
import { EmbeddedPaymentModal } from '@/components/payments/EmbeddedPaymentModal';
import { formatGBP } from '@/lib/formatters';

export default function Credits() {
  usePageTracking({ pagePath: '/credits' });
  usePageMeta({ title: 'Store Credits', description: 'Manage your Eclipse store credits. Top up your wallet and pay for products instantly.', canonicalPath: '/credits' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  
  const {
    balance, totalPurchased, totalGifted, totalSpent,
    transactions, isLoading, fetchBalance
  } = useCredits();

  const wasSuccess = searchParams.get('success') === 'true';
  const wasCanceled = searchParams.get('canceled') === 'true';
  const purchasedAmount = searchParams.get('amount');

  useEffect(() => {
    if (wasSuccess && purchasedAmount) {
      toast.success(`Successfully added ${formatGBP(parseFloat(purchasedAmount))} to your wallet!`);
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
    toast.success(`Successfully added ${formatGBP(creditAmount)} to your wallet!`);
    fetchBalance();
    setPaymentModalOpen(false);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-lg">
          <div className="border border-border rounded-xl overflow-hidden text-center py-10">
            <div className="p-6">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Sign in to view your wallet</h2>
              <p className="text-muted-foreground mb-4 text-sm">
                Create an account or sign in to purchase and use store credits.
              </p>
              <Button onClick={() => navigate('/auth?redirect=/credits')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <AccountPageLayout
      title="Wallet"
      description="Manage your store credits"
      icon={Wallet}
    >
      <WalletBalanceCard
        balance={balance}
        totalPurchased={totalPurchased}
        totalGifted={totalGifted}
        totalSpent={totalSpent}
        isLoading={isLoading}
      />

      

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

      <MyPaymentsCard />

      <EmbeddedPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        paymentType="credits"
        amount={creditAmount}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </AccountPageLayout>
  );
}
