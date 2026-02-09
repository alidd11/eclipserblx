import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ChevronLeft, Tag, X, Check, Sparkles } from 'lucide-react';
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

interface AppliedDiscount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  amount: number;
}

export default function Checkout() {
  usePageTracking({ pagePath: '/checkout' });
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

  // Calculate Eclipse+ member pricing
  const calculateMemberPricing = () => {
    const itemsWithMemberPricing = items.map(item => {
      const eligible = isEligibleForDiscount(item.category_id, item.is_resellable);
      const memberPrice = eligible ? getMemberPrice(item.price, item.category_id, item.is_resellable) : item.price;
      return {
        ...item,
        originalPrice: item.price,
        memberPrice: isSubscribed && eligible ? memberPrice : item.price,
        hasEclipseDiscount: isSubscribed && eligible,
        discountPercent: getDiscountPercent(item.category_id, item.is_resellable),
        // Calculate potential savings for non-members
        potentialMemberPrice: eligible ? memberPrice : item.price,
      };
    });

    const memberSubtotal = itemsWithMemberPricing.reduce((sum, item) => sum + item.memberPrice, 0);
    const eclipseDiscount = isSubscribed ? total - memberSubtotal : 0;
    
    // Calculate potential savings for non-members
    const potentialMemberSubtotal = itemsWithMemberPricing.reduce((sum, item) => sum + item.potentialMemberPrice, 0);
    const potentialSavings = !isSubscribed ? total - potentialMemberSubtotal : 0;

    return { itemsWithMemberPricing, memberSubtotal, eclipseDiscount, potentialSavings };
  };

  const { itemsWithMemberPricing, memberSubtotal, eclipseDiscount, potentialSavings } = calculateMemberPricing();

  // Reset processing state when coming back from Stripe (covers browser back / bfcache restore)
  useEffect(() => {
    const reset = () => setIsProcessing(false);

    // SPA navigation (e.g., cancel_url back to /checkout)
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
  // Apply discount code to member subtotal (after Eclipse+ discount)
  const finalTotal = Math.max(0, memberSubtotal - discountAmount);

  // Redirect to login if not authenticated
  if (!loading && !user) {
    showErrorNotification('Sign In Required', 'Please sign in to checkout');
    return <Navigate to="/auth" state={{ from: '/checkout' }} replace />;
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-6">
          <h1 className="text-3xl font-display font-bold">Your Cart is Empty</h1>
          <p className="text-muted-foreground">Add some products before checking out.</p>
          <Button asChild>
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) {
      showErrorNotification('Error', 'Please enter a discount code');
      return;
    }

    setIsApplyingDiscount(true);

    try {
      const { data: discount, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', discountCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !discount) {
        showErrorNotification('Invalid Code', 'This discount code is not valid');
        return;
      }

      // Check if expired
      if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
        showErrorNotification('Code Expired', 'This discount code has expired');
        return;
      }

      // Check max uses
      if (discount.max_uses && (discount.current_uses || 0) >= discount.max_uses) {
        showErrorNotification('Limit Reached', 'This discount code has reached its usage limit');
        return;
      }

      // Check minimum order (against member subtotal)
      if (discount.min_order_amount && memberSubtotal < discount.min_order_amount) {
        showErrorNotification('Minimum Not Met', `Minimum order of ${formatPrice(Number(discount.min_order_amount))} required`);
        return;
      }

      // Calculate discount amount based on member subtotal
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
      showSuccessNotification('Discount Applied!', `You saved ${formatPrice(amount)}`);
    } catch (error) {
      showErrorNotification('Error', 'Failed to apply discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  const handleStripeCheckout = async () => {
    if (!user?.email) {
      showErrorNotification('Sign In Required', 'Please sign in to continue');
      return;
    }

    // Open embedded payment modal instead of redirecting
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    clearCart();
    showSuccessNotification('Payment Successful!', 'Your order is being processed');
    navigate('/order-success?embedded=true');
  };

  const handlePaymentError = (error: string) => {
    showErrorNotification('Payment Failed', error);
  };

  return (
    <MainLayout>
      {/* Embedded Payment Modal */}
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
        }))}
        discountCodeId={appliedDiscount?.id}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />

      <div className="container py-8 max-w-4xl space-y-8 overflow-x-hidden px-4 sm:px-6 w-full box-border">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-6 w-full min-w-0">
          {/* Order Summary - Now First on Mobile */}
          <div className="order-first lg:order-last gaming-card p-4 sm:p-6 h-fit space-y-6 min-w-0 overflow-hidden">
            <h2 className="text-xl font-display font-bold">Order Summary</h2>
            
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
                    <p className="text-xs text-muted-foreground">Digital Product</p>
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
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Eclipse+ Discount
                  </span>
                  <span className="text-primary">{formatPrice(-eclipseDiscount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount Code</span>
                <span className={discountAmount > 0 ? 'text-primary' : ''}>
                  {discountAmount > 0 ? formatPrice(-discountAmount) : formatPrice(0)}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  You're saving {formatPrice(eclipseDiscount)} with Eclipse+!
                </p>
              )}
            </div>

            {/* Sending receipt to user email */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Receipt will be sent to: <span className="font-medium text-foreground">{user?.email}</span>
              </p>
            </div>

            {/* Eclipse+ Upsell for non-members */}
            {!isSubscribed && potentialSavings > 0 && (
              <Link 
                to="/eclipse-plus" 
                className="block p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-400">
                      You could save {formatPrice(potentialSavings)} with Eclipse+
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get up to 35% off all products + 1 free item monthly for just £3.99/mo
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>

            {/* Discount & Payment */}
            <div className="space-y-6 min-w-0 overflow-hidden">
            {/* Only show discount code section if Eclipse+ discount is NOT applied */}
            {!(isSubscribed && eclipseDiscount > 0) && (
              <div className="gaming-card p-4 sm:p-6 space-y-4">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Discount Code
                </h2>
                
                {appliedDiscount ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium">{appliedDiscount.code}</span>
                      <span className="text-sm text-muted-foreground">
                        ({appliedDiscount.discount_type === 'percentage' 
                          ? `${appliedDiscount.discount_value}% off` 
                          : `${formatPrice(appliedDiscount.discount_value)} off`})
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
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
                      placeholder="Enter code"
                      className="bg-background uppercase"
                      onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={applyDiscount}
                      disabled={isApplyingDiscount}
                    >
                      {isApplyingDiscount ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="gaming-card p-4 sm:p-6 space-y-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </h2>

              <PaymentMethodDisplay
                items={itemsWithMemberPricing.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.memberPrice,
                  originalPrice: item.originalPrice,
                  image: item.image,
                  category_slug: item.category_slug,
                  category_id: item.category_id,
                }))}
                total={finalTotal}
                email={user?.email || ''}
                accessToken={session?.access_token}
                discountCodeId={appliedDiscount?.id}
                isProcessing={isProcessing}
                onProcessing={setIsProcessing}
                onCardCheckout={handleStripeCheckout}
              />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}