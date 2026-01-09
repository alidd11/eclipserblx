import { useState, useEffect } from 'react';
import { useStripe } from '@stripe/react-stripe-js';
import { PaymentRequest } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  category_slug?: string;
}

interface PaymentRequestButtonProps {
  items: CartItem[];
  total: number;
  email: string;
  accessToken?: string;
  onProcessing: (processing: boolean) => void;
}

export function PaymentRequestButton({ 
  items, 
  total, 
  email, 
  accessToken,
  onProcessing 
}: PaymentRequestButtonProps) {
  const stripe = useStripe();
  const navigate = useNavigate();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState<boolean | null>(null);
  const [walletType, setWalletType] = useState<'applePay' | 'googlePay' | null>(null);

  useEffect(() => {
    if (!stripe || items.length === 0) return;

    const pr = stripe.paymentRequest({
      country: 'GB',
      currency: 'gbp',
      total: {
        label: 'Total',
        amount: Math.round(total * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment()
      .then((result) => {
        console.info('[PaymentRequest] canMakePayment result', result);
        if (result) {
          setCanMakePayment(true);
          setPaymentRequest(pr);
          if (result.applePay) {
            setWalletType('applePay');
          } else if (result.googlePay) {
            setWalletType('googlePay');
          }
        } else {
          setCanMakePayment(false);
        }
      })
      .catch((err) => {
        console.error('[PaymentRequest] canMakePayment error', err);
        setCanMakePayment(false);
      });
  }, [stripe, items, total]);

  useEffect(() => {
    if (!paymentRequest) return;

    const handlePaymentMethod = async (event: any) => {
      onProcessing(true);

      try {
        // Create PaymentIntent on the server
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { items, email },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (error || !data?.clientSecret) {
          throw new Error(error?.message || 'Failed to create payment intent');
        }

        // Confirm the payment
        const { error: confirmError, paymentIntent } = await stripe!.confirmCardPayment(
          data.clientSecret,
          { payment_method: event.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          event.complete('fail');
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status === 'requires_action') {
          const { error: actionError } = await stripe!.confirmCardPayment(data.clientSecret);
          if (actionError) {
            event.complete('fail');
            throw new Error(actionError.message);
          }
        }

        event.complete('success');
        toast.success('Payment successful!');
        navigate(`/order-success?payment_intent=${data.paymentIntentId}`);
      } catch (err: any) {
        console.error('Payment error:', err);
        toast.error(err.message || 'Payment failed');
        event.complete('fail');
        onProcessing(false);
      }
    };

    paymentRequest.on('paymentmethod', handlePaymentMethod);

    return () => {
      paymentRequest.off('paymentmethod', handlePaymentMethod);
    };
  }, [paymentRequest, items, email, accessToken, stripe, navigate, onProcessing]);

  // Still checking availability
  if (canMakePayment === null) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  // Wallet not available
  if (!canMakePayment || !paymentRequest) {
    return null;
  }

  const handleClick = () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    paymentRequest.show();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full h-12 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 ${
        walletType === 'applePay' 
          ? 'bg-black' 
          : 'bg-[#4285F4]'
      }`}
    >
      {walletType === 'applePay' ? (
        <>
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M17.72 8.2c-.1.08-1.86 1.08-1.86 3.3 0 2.57 2.26 3.48 2.32 3.5-.01.06-.36 1.24-1.2 2.45-.73 1.07-1.49 2.14-2.69 2.14-1.18 0-1.56-.69-2.99-.69-1.4 0-1.9.71-2.99.71-1.18 0-2.01-1.15-2.74-2.14-1-1.35-1.8-3.46-1.8-5.46 0-3.2 2.08-4.9 4.12-4.9 1.08 0 1.99.71 2.67.71.65 0 1.67-.75 2.9-.75.47 0 2.15.04 3.26 1.63zm-3.85-2.98c.53-.64.91-1.52.91-2.41 0-.12-.01-.25-.03-.35-.87.03-1.9.58-2.52 1.3-.49.56-.95 1.44-.95 2.34 0 .14.02.27.03.31.05.01.14.02.22.02.78 0 1.76-.52 2.34-1.21z"/>
          </svg>
          Pay with Apple Pay
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Pay with Google Pay
        </>
      )}
    </button>
  );
}
