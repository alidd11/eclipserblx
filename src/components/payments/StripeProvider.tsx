import { ReactNode, useMemo } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Initialize Stripe outside the component to avoid recreating on each render
let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      stripePromise = loadStripe(publishableKey);
    }
  }
  return stripePromise;
}

export function StripeProvider({ children, fallback }: StripeProviderProps) {
  const stripe = useMemo(() => getStripePromise(), []);

  // If no Stripe key, render fallback or nothing for payment buttons
  if (!stripe) {
    console.error('Stripe publishable key not found');
    return <>{fallback ?? null}</>;
  }

  return (
    <Elements stripe={stripe} options={{ locale: 'en-GB' }}>
      {children}
    </Elements>
  );
}
