import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Check, Sparkles, Gift } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { PaymentMethodDisplay } from '@/components/payments/PaymentMethodDisplay';
import { EmbeddedPaymentModal } from '@/components/payments/EmbeddedPaymentModal';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';

interface AppliedDiscount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  amount: number;
}

export default function Checkout() {
  usePageTracking({ pagePath: '/checkout' });
  usePageMeta({ title: 'Checkout', canonicalPath: '/checkout' });
  const { t } = useTranslation();
  const { items, total, clearCart } = useCart();
  const { user, session, loading } = useAuth();
  const { isSubscribed, getMemberPrice, isEligibleForDiscount, getDiscountPercent } = useSubscription();
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Calculate member pricing
  const calculateMemberPricing = () => {
    const itemsWithMemberPricing = items.map(item => {
      const effectivePrice = item.is_pwyw ? (item.custom_price ?? item.price) : item.price;
      const eligible = !item.is_pwyw && isEligibleForDiscount(item.category_id, item.is_resellable, item.store_eclipse_enabled);
      const memberPrice = eligible ? getMemberPrice(effectivePrice, item.category_id, item.is_resellable) : effectivePrice;
      return {
        ...item,
        originalPrice: effectivePrice,
        memberPrice: isSubscribed && eligible ? memberPrice : effectivePrice,
        hasEclipseDiscount: isSubscribed && eligible,
        discountPercent: getDiscountPercent(item.category_id, item.is_resellable),
        potentialMemberPrice: eligible ? memberPrice : effectivePrice,
      };
    });

    const memberSubtotal = itemsWithMemberPricing.reduce((sum, item) => sum + item.memberPrice, 0);
    const originalTotal = items.reduce((sum, item) => sum + (item.is_pwyw ? (item.custom_price ?? item.price) : item.price), 0);
    const eclipseDiscount = isSubscribed ? originalTotal - memberSubtotal : 0;
    const potentialMemberSubtotal = itemsWithMemberPricing.reduce((sum, item) => sum + item.potentialMemberPrice, 0);
    const potentialSavings = !isSubscribed ? originalTotal - potentialMemberSubtotal : 0;

    return { itemsWithMemberPricing, memberSubtotal, eclipseDiscount, potentialSavings };
  };

  const { itemsWithMemberPricing, memberSubtotal, eclipseDiscount, potentialSavings } = calculateMemberPricing();

  // Reset processing state when coming back from Stripe
  useEffect(() => {
    const reset = () => setIsProcessing(false);
    reset();

    const handlePageShow = () => reset();
    const handleVisibilityChange = () => {
      if (!document.hidden) reset();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', reset);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', reset);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.key]);

  const discountAmount = appliedDiscount?.amount || 0;
  const finalTotal = Math.max(0, memberSubtotal - discountAmount);

  if (!loading && !user) {
    showErrorNotification(t('checkout.signInRequired'), t('checkout.signInToCheckout'));
    return <Navigate to="/auth" state={{ from: '/checkout' }} replace />;
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-6">
          <h1 className="text-3xl font-display font-bold">{t('cart.cartEmpty')}</h1>
          <p className="text-muted-foreground">{t('checkout.addProducts')}</p>
          <Button asChild>
            <Link to="/products">{t('common.browseProducts')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) {
      showErrorNotification(t('common.error'), 'Please enter a discount code');
      return;
    }

    setIsApplyingDiscount(true);

    try {
      const productIds = items.map(i => i.id);
      const { data: discountRows, error } = await supabase
        .rpc('validate_discount_code_for_checkout', {
          p_code: discountCode.toUpperCase(),
          p_product_ids: productIds,
          p_subtotal: memberSubtotal,
        });

      const discount = discountRows?.[0] ?? null;

      if (error || !discount) {
        showErrorNotification(t('checkout.invalidCode'), t('checkout.invalidCode'));
        return;
      }

      // All validation (store match, expiry, usage limits, min order, user restriction)
      // is handled server-side by validate_discount_code_for_checkout RPC.

      let amount = 0;
      if (discount.discount_type === 'percentage') {
        amount = (memberSubtotal * discount.discount_value) / 100;
      } else {
        amount = Math.min(discount.discount_value, memberSubtotal);
      }

      setAppliedDiscount({
        id: discount.id,
        code: discount.code,
        discount_type: discount.discount_type as 'percentage' | 'fixed',
        discount_value: discount.discount_value,
        amount,
      });

      setDiscountCode('');
      showSuccessNotification(t('checkout.discountApplied'), t('checkout.youSaved', { amount: formatPrice(amount) }));
    } catch (error) {
      showErrorNotification(t('common.error'), 'Failed to apply discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  const isFreeOrder = finalTotal === 0;

  const handleFreeOrder = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const freeItems = items.map(item => ({
        id: item.id,
        custom_price: 0,
      }));

      const { data, error } = await supabase.functions.invoke('fulfill-free-order', {
        body: { items: freeItems },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      clearCart();
      showSuccessNotification(t('checkout.paymentSuccess'), 'Your free products are ready to download!');
      navigate(`/order-success?order_id=${data.orderId}&free=true`);
    } catch (err) {
      showErrorNotification(t('common.error'), err.message || 'Failed to claim free products');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!user?.email) {
      showErrorNotification(t('checkout.signInRequired'), t('checkout.signInToCheckout'));
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (result?: { paymentIntentId?: string; subscriptionId?: string }) => {
    clearCart();
    showSuccessNotification(t('checkout.paymentSuccess'), t('checkout.orderProcessing'));
    const piParam = result?.paymentIntentId ? `&payment_intent=${result.paymentIntentId}` : '';
    navigate(`/order-success?embedded=true${piParam}`);
  };

  const handlePaymentError = (error: string) => {
    showErrorNotification(t('checkout.paymentFailed'), error);
  };

  return (
    <MainLayout>
      <EmbeddedPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        paymentType="checkout"
        items={itemsWithMemberPricing.map(item => ({
          id: item.id,
          name: item.name,
          price: item.memberPrice,
          originalPrice: item.originalPrice,
          image: item.image,
          category_slug: item.category_slug,
          category_id: item.category_id,
          is_pwyw: item.is_pwyw,
          custom_price: item.is_pwyw ? item.memberPrice : undefined,
        }))}
        discountCodeId={appliedDiscount?.id}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      <div className="container py-8 max-w-4xl space-y-8 px-4 sm:px-6 w-full box-border">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          {t('checkout.backToCart')}
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold">{t('checkout.checkout')}</h1>

        <div className="grid lg:grid-cols-2 gap-6 w-full min-w-0">
          {/* Order Summary */}
          <div className="order-first lg:order-last border border-border rounded-xl bg-card p-4 sm:p-6 h-fit space-y-6 min-w-0 overflow-hidden">
            <h2 className="text-lg font-semibold">{t('checkout.orderSummary')}</h2>
            
            <div className="space-y-3">
              {itemsWithMemberPricing.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground/30">{item.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-medium truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.store_name ? `${item.store_name} • ` : ''}{t('common.digitalProduct')}
                    </p>
                  </div>
                  <div className="text-right">
                    {item.hasEclipseDiscount ? (
                      <>
                        <span className="font-medium text-primary">{formatPrice(item.memberPrice)}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-0">
                            -{item.discountPercent}%
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <span className="font-medium">{formatPrice(item.memberPrice)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('checkout.subtotal')}</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    {t('cart.eclipseDiscount')}
                  </span>
                  <span className="text-primary">{formatPrice(-eclipseDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('checkout.discountCode')}</span>
                <span className={discountAmount > 0 ? 'text-primary' : ''}>
                  {discountAmount > 0 ? formatPrice(-discountAmount) : formatPrice(0)}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>{t('checkout.total')}</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {t('cart.savingWith', { amount: formatPrice(eclipseDiscount) })}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {t('checkout.receiptSentTo')} <span className="font-medium text-foreground">{user?.email}</span>
              </p>
            </div>
          </div>

          {/* Discount & Payment */}
          <div className="space-y-6 min-w-0 overflow-hidden">
            {!(isSubscribed && eclipseDiscount > 0) && (
              <div className="border border-border rounded-xl bg-card p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold">{t('checkout.discountCode')}</h2>
                
                {appliedDiscount ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium">{appliedDiscount.code}</span>
                      <span className="text-sm text-muted-foreground">
                        ({appliedDiscount.discount_type === 'percentage' 
                          ? t('checkout.percentOff', { value: appliedDiscount.discount_value })
                          : t('checkout.amountOff', { amount: formatPrice(appliedDiscount.discount_value) })})
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" aria-label="Close" 
                      className="h-8 w-8"
                      onClick={removeDiscount}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder={t('checkout.enterCode')}
                      className="bg-background uppercase"
                      onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={applyDiscount}
                      disabled={isApplyingDiscount}
                    >
                      {isApplyingDiscount ? t('checkout.applying') : t('common.apply')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="border border-border rounded-xl bg-card p-4 sm:p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {isFreeOrder ? 'Claim Products' : t('checkout.payment')}
              </h2>

              {isFreeOrder ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    These products are free — no payment required!
                  </p>
                  <Button
                    onClick={handleFreeOrder}
                    className="w-full h-12 gradient-button border-0 text-base font-semibold"
                    disabled={isProcessing}
                  >
                    <Gift className="h-5 w-5 mr-2" />
                    {isProcessing ? 'Claiming...' : 'Get for Free'}
                  </Button>
                </div>
              ) : (
                <PaymentMethodDisplay
                  items={itemsWithMemberPricing.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.memberPrice,
                    originalPrice: item.originalPrice,
                    image: item.image,
                    category_slug: item.category_slug,
                    category_id: item.category_id,
                    is_pwyw: item.is_pwyw,
                    custom_price: item.is_pwyw ? item.memberPrice : undefined,
                  }))}
                  total={finalTotal}
                  email={user?.email || ''}
                  accessToken={session?.access_token}
                  discountCodeId={appliedDiscount?.id}
                  isProcessing={isProcessing}
                  onProcessing={setIsProcessing}
                  onCardCheckout={handleStripeCheckout}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
