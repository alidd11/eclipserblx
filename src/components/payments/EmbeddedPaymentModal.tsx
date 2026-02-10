import { useState, useEffect, useMemo } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51Sl84pCjEHxHwNl9cWPDitNkEcjiqaiOiq9l3Y0Z9HY89atChTJEY19WK2O9447JBz97YzdpLqefTVmjjyHmfiCo00wpuvzsB9';

// Initialize Stripe outside the component (only if configured)
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function resolveHslCssVar(varName: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `hsl(${raw})` : undefined;
}

function createStripeAppearance() {
  const colorPrimary = resolveHslCssVar('--primary');
  const colorBackground = resolveHslCssVar('--card');
  const colorText = resolveHslCssVar('--foreground');
  const colorDanger = resolveHslCssVar('--destructive');

  return {
    theme: 'night',
    variables: {
      ...(colorPrimary ? { colorPrimary } : {}),
      ...(colorBackground ? { colorBackground } : {}),
      ...(colorText ? { colorText } : {}),
      ...(colorDanger ? { colorDanger } : {}),
      fontFamily: 'inherit',
      borderRadius: '0.5rem',
    },
  } as const;
}

export type PaymentType = 'checkout' | 'credits' | 'subscription' | 'ad_pings';

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category_slug?: string;
  category_id?: string;
}

interface EmbeddedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentType: PaymentType;
  // For checkout
  items?: CartItem[];
  discountCodeId?: string;
  // For credits
  amount?: number;
  // For subscription
  tier?: string;
  billingPeriod?: 'monthly' | 'annual';
  // For ad pings
  herePings?: number;
  everyonePings?: number;
  // Callbacks
  onSuccess?: (result: { paymentIntentId?: string; subscriptionId?: string }) => void;
  onError?: (error: string) => void;
}

interface PaymentFormProps {
  clientSecret: string;
  intentType: 'payment_intent' | 'setup_intent';
  paymentType: PaymentType;
  tier?: string;
  billingPeriod?: string;
  amount?: number;
  onSuccess?: (result: { paymentIntentId?: string; subscriptionId?: string }) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

function PaymentForm({ 
  clientSecret, 
  intentType, 
  paymentType,
  tier,
  billingPeriod,
  amount,
  onSuccess, 
  onError, 
  onClose 
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage(null);

    try {
      let result;

      if (intentType === 'setup_intent') {
        result = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        });
      } else {
        result = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        });
      }

      if (result.error) {
        setPaymentStatus('error');
        setErrorMessage(result.error.message || 'Payment failed');
        onError?.(result.error.message || 'Payment failed');
      } else {
        // Payment succeeded, confirm with backend
        const confirmPayload: Record<string, unknown> = {};
        
        if (intentType === 'setup_intent' && 'setupIntent' in result) {
          confirmPayload.setupIntentId = result.setupIntent?.id;
          confirmPayload.tier = tier;
          confirmPayload.billingPeriod = billingPeriod;
        } else if ('paymentIntent' in result) {
          confirmPayload.paymentIntentId = result.paymentIntent?.id;
        }

        const { data, error } = await supabase.functions.invoke('confirm-embedded-payment', {
          body: confirmPayload,
          headers: session?.access_token ? {
            Authorization: `Bearer ${session.access_token}`,
          } : undefined,
        });

        if (error || data?.error) {
          throw new Error(error?.message || data?.error || 'Failed to confirm payment');
        }

        setPaymentStatus('success');
        
        setTimeout(() => {
          onSuccess?.({ 
            paymentIntentId: data?.paymentIntentId,
            subscriptionId: data?.subscriptionId,
          });
          onClose();
        }, 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setPaymentStatus('error');
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Payment Successful!</h3>
        <p className="text-muted-foreground text-center">
          Your payment has been processed successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 min-h-[180px]">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full h-12 gradient-button border-0 font-semibold"
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay {amount ? `£${(amount / 100).toFixed(2)}` : 'Now'}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" />
        Secure payment powered by Stripe
      </p>
    </form>
  );
}

export function EmbeddedPaymentModal({
  open,
  onOpenChange,
  paymentType,
  items,
  discountCodeId,
  amount,
  tier,
  billingPeriod,
  herePings,
  everyonePings,
  onSuccess,
  onError,
}: EmbeddedPaymentModalProps) {
  const { session } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<'payment_intent' | 'setup_intent'>('payment_intent');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stripeAppearance = useMemo(() => createStripeAppearance(), []);

  useEffect(() => {
    if (!open) return;

    if (!stripePromise) {
      setError('Payments are temporarily unavailable (Stripe is not configured).');
      return;
    }

    const requiresAuth = paymentType === 'credits' || paymentType === 'subscription' || paymentType === 'ad_pings';

    if (!session?.access_token) {
      if (requiresAuth) {
        setError('Please sign in to continue.');
      } else {
        // Checkout can be initialized without an authenticated session
        createPaymentIntent();
      }
      return;
    }

    createPaymentIntent();
  }, [open, session?.access_token, paymentType]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);
    setClientSecret(null);

    try {
      const body: Record<string, unknown> = { type: paymentType };

      if (paymentType === 'checkout' && items) {
        body.items = items;
        body.discountCodeId = discountCodeId;
      } else if (paymentType === 'credits' && amount) {
        body.amount = amount;
      } else if (paymentType === 'subscription') {
        body.tier = tier;
        body.billingPeriod = billingPeriod;
      } else if (paymentType === 'ad_pings') {
        body.herePings = herePings;
        body.everyonePings = everyonePings;
      }

      const { data, error: invokeError } = await supabase.functions.invoke('create-payment-intent', {
        body,
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      setClientSecret(data.clientSecret);
      setIntentType(data.intentType || 'payment_intent');
      setPaymentAmount(data.amount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after modal closes
    setTimeout(() => {
      setClientSecret(null);
      setError(null);
    }, 300);
  };

  const getTitle = () => {
    switch (paymentType) {
      case 'checkout': return 'Complete Purchase';
      case 'credits': return 'Add Credits';
      case 'subscription': return 'Subscribe to Eclipse+';
      case 'ad_pings': return 'Purchase Ad Pings';
      default: return 'Payment';
    }
  };

  const getDescription = () => {
    switch (paymentType) {
      case 'checkout': return 'Enter your payment details to complete your order.';
      case 'credits': return `Add £${amount?.toFixed(2)} to your account balance.`;
      case 'subscription': return `Subscribe to Eclipse+ ${tier} (${billingPeriod}).`;
      case 'ad_pings': return 'Purchase additional pings for your advertisements.';
      default: return 'Complete your payment securely.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing payment...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive text-center">{error}</p>
              {stripePromise ? (
                <Button variant="outline" onClick={createPaymentIntent}>
                  Try Again
                </Button>
              ) : null}
            </div>
          )}

          {clientSecret && !isLoading && !error && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
                loader: 'auto',
              }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                intentType={intentType}
                paymentType={paymentType}
                tier={tier}
                billingPeriod={billingPeriod}
                amount={paymentAmount}
                onSuccess={onSuccess}
                onError={onError}
                onClose={handleClose}
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
