import { useState, useCallback } from 'react';
import type { PaymentType } from '@/components/payments/EmbeddedPaymentModal';

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category_slug?: string;
  category_id?: string;
}

interface UseEmbeddedPaymentOptions {
  onSuccess?: (result: { paymentIntentId?: string; subscriptionId?: string }) => void;
  onError?: (error: string) => void;
}

export function useEmbeddedPayment(options: UseEmbeddedPaymentOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    type: PaymentType;
    items?: CartItem[];
    discountCodeId?: string;
    amount?: number;
    tier?: string;
    billingPeriod?: 'monthly' | 'annual';
    herePings?: number;
    everyonePings?: number;
  } | null>(null);

  const openCheckout = useCallback((params: {
    items: CartItem[];
    discountCodeId?: string;
  }) => {
    setPaymentConfig({
      type: 'checkout',
      items: params.items,
      discountCodeId: params.discountCodeId,
    });
    setIsOpen(true);
  }, []);

  const openCreditsPayment = useCallback((amount: number) => {
    setPaymentConfig({
      type: 'credits',
      amount,
    });
    setIsOpen(true);
  }, []);

  const openSubscription = useCallback((params: {
    tier: string;
    billingPeriod: 'monthly' | 'annual';
  }) => {
    setPaymentConfig({
      type: 'subscription',
      tier: params.tier,
      billingPeriod: params.billingPeriod,
    });
    setIsOpen(true);
  }, []);

  const openAdPings = useCallback((params: {
    herePings?: number;
    everyonePings?: number;
  }) => {
    setPaymentConfig({
      type: 'ad_pings',
      herePings: params.herePings,
      everyonePings: params.everyonePings,
    });
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Reset config after animation
    setTimeout(() => setPaymentConfig(null), 300);
  }, []);

  const handleSuccess = useCallback((result: { paymentIntentId?: string; subscriptionId?: string }) => {
    options.onSuccess?.(result);
    close();
  }, [options.onSuccess, close]);

  const handleError = useCallback((error: string) => {
    options.onError?.(error);
  }, [options.onError]);

  return {
    isOpen,
    setIsOpen,
    paymentConfig,
    openCheckout,
    openCreditsPayment,
    openSubscription,
    openAdPings,
    close,
    handleSuccess,
    handleError,
  };
}
