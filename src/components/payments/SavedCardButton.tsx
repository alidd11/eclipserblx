import { useState } from 'react';
import { CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useNavigate } from 'react-router-dom';
import type { SavedPaymentMethod } from '@/hooks/useSavedPaymentMethods';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category_slug?: string;
}

interface SavedCardButtonProps {
  method: SavedPaymentMethod;
  items: CartItem[];
  total: number;
  accessToken?: string;
  discountCodeId?: string;
  isProcessing: boolean;
  onProcessing: (processing: boolean) => void;
}

// Card brand icons
function CardBrandIcon({ brand }: { brand: string }) {
  const brandLower = brand.toLowerCase();
  
  // Visa
  if (brandLower === 'visa') {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-auto">
        <rect fill="#1A1F71" width="48" height="32" rx="4" />
        <path fill="#fff" d="M19.5 21h-2.7l1.7-10.4h2.7L19.5 21zm11.1-10.1c-.5-.2-1.4-.4-2.4-.4-2.7 0-4.6 1.4-4.6 3.4 0 1.5 1.4 2.3 2.4 2.8 1 .5 1.4.9 1.4 1.3 0 .7-.8 1-1.6 1-1.1 0-1.6-.2-2.5-.5l-.3-.2-.4 2.2c.6.3 1.8.5 3 .5 2.9 0 4.7-1.4 4.7-3.5 0-1.2-.7-2.1-2.3-2.8-.9-.5-1.5-.8-1.5-1.3 0-.4.5-.9 1.5-.9.9 0 1.5.2 2 .4l.2.1.4-2.1zm7.1-.3h-2.1c-.7 0-1.2.2-1.5.9L30 21h2.9l.6-1.6h3.5l.3 1.6h2.5l-2.2-10.4h-1.9zm-2.4 6.7l1.1-2.9.3-.9.2.8.6 3h-2.2zM15.4 10.6L12.7 18l-.3-1.4c-.5-1.7-2.1-3.6-3.8-4.5l2.4 8.9h2.9l4.4-10.4h-2.9z"/>
        <path fill="#F9A533" d="M10.3 10.6H6l-.1.3c3.4.9 5.7 2.9 6.6 5.4l-1-4.8c-.2-.7-.7-.9-1.2-.9z"/>
      </svg>
    );
  }
  
  // Mastercard
  if (brandLower === 'mastercard') {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-auto">
        <rect fill="#000" width="48" height="32" rx="4" />
        <circle fill="#EB001B" cx="18" cy="16" r="8" />
        <circle fill="#F79E1B" cx="30" cy="16" r="8" />
        <path fill="#FF5F00" d="M24 10.3a8 8 0 0 0-2.9 5.7 8 8 0 0 0 2.9 5.7 8 8 0 0 0 2.9-5.7 8 8 0 0 0-2.9-5.7z"/>
      </svg>
    );
  }
  
  // Amex
  if (brandLower === 'amex' || brandLower === 'american_express') {
    return (
      <svg viewBox="0 0 48 32" className="h-6 w-auto">
        <rect fill="#006FCF" width="48" height="32" rx="4" />
        <path fill="#fff" d="M8 12h5l.8 1.8L14.6 12h19.3v8H14.6l-.8-1.8-.8 1.8H8v-8zm1.5 1.2v5.6h2.3v-1.4h2.5l.8 1.4h2.6l-1-1.5c.5-.3.9-.9.9-1.6 0-1.3-1-2.5-2.6-2.5h-5.5zm2.3 1.4h2.4c.5 0 .8.3.8.7 0 .4-.3.7-.8.7h-2.4v-1.4z"/>
      </svg>
    );
  }
  
  // Default card icon
  return <CreditCard className="h-5 w-5 text-muted-foreground" />;
}

export function SavedCardButton({
  method,
  items,
  total,
  accessToken,
  discountCodeId,
  isProcessing,
  onProcessing,
}: SavedCardButtonProps) {
  const navigate = useNavigate();
  const [isCharging, setIsCharging] = useState(false);

  const handlePayWithSavedCard = async () => {
    if (!accessToken) {
      showErrorNotification('Error', 'Please sign in to continue');
      return;
    }

    setIsCharging(true);
    onProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('charge-saved-method', {
        body: {
          items,
          paymentMethodId: method.id,
          discountCodeId,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;

      if (data?.success) {
        showSuccessNotification('Payment Successful!', 'Your order is being processed');
        navigate(`/order-success?payment_intent=${data.paymentIntentId}`);
      } else {
        throw new Error(data?.error || 'Payment failed');
      }
    } catch (err: any) {
      console.error('Saved card payment error:', err);
      showErrorNotification('Payment Failed', err.message || 'Please try again or use a different payment method');
      onProcessing(false);
    } finally {
      setIsCharging(false);
    }
  };

  const isThisCardProcessing = isCharging || isProcessing;

  return (
    <Button
      onClick={handlePayWithSavedCard}
      variant="outline"
      className="w-full h-14 justify-between px-4 border-border hover:border-primary hover:bg-primary/5 transition-all group"
      disabled={isThisCardProcessing}
    >
      <div className="flex items-center gap-3">
        <CardBrandIcon brand={method.brand} />
        <div className="text-left">
          <p className="font-medium capitalize">
            {method.brand} •••• {method.last4}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear.toString().slice(-2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {method.isDefault && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Default
          </span>
        )}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {isCharging ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </div>
      </div>
    </Button>
  );
}
