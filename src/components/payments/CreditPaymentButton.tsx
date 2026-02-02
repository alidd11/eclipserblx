import { useState } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useCurrency } from '@/hooks/useCurrency';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useCart } from '@/hooks/useCart';

interface CartItem {
  id: string;
  name: string;
  price: number;
}

interface CreditPaymentButtonProps {
  items: CartItem[];
  total: number;
  isProcessing: boolean;
  onProcessing: (processing: boolean) => void;
}

export function CreditPaymentButton({
  items,
  total,
  isProcessing,
  onProcessing,
}: CreditPaymentButtonProps) {
  const navigate = useNavigate();
  const { balance, isLoading, purchaseWithCredits } = useCredits();
  const { formatPrice } = useCurrency();
  const { clearCart } = useCart();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const canAfford = balance >= total;
  const isDisabled = isProcessing || isPurchasing || isLoading || !canAfford || total < 1;

  const handleCreditPurchase = async () => {
    if (!canAfford) {
      showErrorNotification('Insufficient Credits', `You need ${formatPrice(total)} but only have ${formatPrice(balance)}`);
      return;
    }

    if (total < 1) {
      showErrorNotification('Minimum Order', 'Minimum order amount is £1.00');
      return;
    }

    setIsPurchasing(true);
    onProcessing(true);

    try {
      const result = await purchaseWithCredits(items);

      if (result.success) {
        clearCart();
        showSuccessNotification('Purchase Complete!', 'Your order has been placed using credits');
        navigate(`/order-success?orderId=${result.orderId}`);
      } else {
        showErrorNotification('Purchase Failed', result.error || 'Failed to complete purchase');
      }
    } catch (error) {
      console.error('Credit purchase error:', error);
      showErrorNotification('Purchase Failed', 'An unexpected error occurred');
    } finally {
      setIsPurchasing(false);
      onProcessing(false);
    }
  };

  // Don't show if loading or no balance
  if (isLoading) {
    return null;
  }

  // Don't show if user has no credits at all
  if (balance <= 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleCreditPurchase}
        disabled={isDisabled}
        className={`w-full h-14 font-semibold text-base ${
          canAfford 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0' 
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        }`}
      >
        {isPurchasing ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Coins className="h-5 w-5 mr-2" />
            {canAfford 
              ? `Pay with Credits (${formatPrice(balance)} available)` 
              : `Insufficient credits (${formatPrice(balance)})`
            }
          </>
        )}
      </Button>
      
      {!canAfford && balance > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          You need {formatPrice(total - balance)} more credits
        </p>
      )}
    </div>
  );
}
