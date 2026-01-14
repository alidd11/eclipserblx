import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CreditCard, ChevronLeft, Tag, X, Check, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { PaymentMethodDisplay } from '@/components/payments/PaymentMethodDisplay';

interface AppliedDiscount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  amount: number;
}

export default function Checkout() {
  const { items, total } = useCart();
  const { user, session, loading } = useAuth();
  const { isSubscribed, getMemberPrice, isEligibleForDiscount, getDiscountPercent } = useSubscription();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  // Calculate Eclipse+ member pricing
  const calculateMemberPricing = () => {
    const itemsWithMemberPricing = items.map(item => {
      const eligible = isEligibleForDiscount(item.category_id);
      const memberPrice = eligible ? getMemberPrice(item.price, item.category_id) : item.price;
      return {
        ...item,
        originalPrice: item.price,
        memberPrice: isSubscribed && eligible ? memberPrice : item.price,
        hasEclipseDiscount: isSubscribed && eligible,
        discountPercent: getDiscountPercent(item.category_id),
      };
    });

    const memberSubtotal = itemsWithMemberPricing.reduce((sum, item) => sum + item.memberPrice, 0);
    const eclipseDiscount = isSubscribed ? total - memberSubtotal : 0;

    return { itemsWithMemberPricing, memberSubtotal, eclipseDiscount };
  };

  const { itemsWithMemberPricing, memberSubtotal, eclipseDiscount } = calculateMemberPricing();

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
        showErrorNotification('Minimum Not Met', `Minimum order of £${discount.min_order_amount.toFixed(2)} required`);
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
      showSuccessNotification('Discount Applied!', `You saved £${amount.toFixed(2)}`);
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

    setIsProcessing(true);

    try {
      // Send items with member pricing applied
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: itemsWithMemberPricing.map(item => ({
            id: item.id,
            name: item.name,
            price: item.memberPrice, // Use member price
            originalPrice: item.originalPrice,
            image: item.image,
            category_slug: item.category_slug,
            category_id: item.category_id,
          })),
          email: user.email,
          discountCodeId: appliedDiscount?.id,
          eclipseDiscount: eclipseDiscount,
          isEclipseMember: isSubscribed,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      showErrorNotification('Checkout Failed', error.message || 'Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl space-y-8 overflow-x-hidden">
        <Link to="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary - Now First on Mobile */}
          <div className="order-first lg:order-last gaming-card p-6 h-fit space-y-6">
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
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Digital Product</p>
                  </div>
                  <div className="text-right">
                    {item.hasEclipseDiscount ? (
                      <>
                        <span className="font-medium text-primary">£{item.memberPrice.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground line-through">£{item.originalPrice.toFixed(2)}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-0">
                            -{item.discountPercent}%
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <span className="font-medium">£{item.memberPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{total.toFixed(2)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    Eclipse+ Discount
                  </span>
                  <span className="text-primary">-£{eclipseDiscount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount Code</span>
                <span className={discountAmount > 0 ? 'text-primary' : ''}>
                  {discountAmount > 0 ? `-£${discountAmount.toFixed(2)}` : '£0.00'}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>£{finalTotal.toFixed(2)}</span>
              </div>
              
              {isSubscribed && eclipseDiscount > 0 && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  You're saving £{eclipseDiscount.toFixed(2)} with Eclipse+!
                </p>
              )}
            </div>

            {/* Sending receipt to user email */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Receipt will be sent to: <span className="font-medium text-foreground">{user?.email}</span>
              </p>
            </div>
          </div>

            {/* Discount & Payment */}
            <div className="space-y-6">
            {/* Only show discount code section if Eclipse+ discount is NOT applied */}
            {!(isSubscribed && eclipseDiscount > 0) && (
              <div className="gaming-card p-6 space-y-4">
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
                          : `£${appliedDiscount.discount_value.toFixed(2)} off`})
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

            <div className="gaming-card p-6 space-y-4">
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