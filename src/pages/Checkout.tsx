import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CreditCard, ChevronLeft, Tag, X, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  const discountAmount = appliedDiscount?.amount || 0;
  const finalTotal = Math.max(0, total - discountAmount);

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

      // Check minimum order
      if (discount.min_order_amount && total < discount.min_order_amount) {
        showErrorNotification('Minimum Not Met', `Minimum order of £${discount.min_order_amount.toFixed(2)} required`);
        return;
      }

      // Calculate discount amount
      let amount = 0;
      if (discount.discount_type === 'percentage') {
        amount = (total * discount.discount_value) / 100;
      } else {
        amount = Math.min(discount.discount_value, total);
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
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            category_slug: item.category_slug,
          })),
          email: user.email,
          discountCodeId: appliedDiscount?.id,
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
      <div className="container py-8 max-w-4xl space-y-8">
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
              {items.map((item) => (
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
                  <span className="font-medium">£{item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>£{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className={discountAmount > 0 ? 'text-primary' : ''}>
                  {discountAmount > 0 ? `-£${discountAmount.toFixed(2)}` : '£0.00'}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>£{finalTotal.toFixed(2)}</span>
              </div>
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

            <div className="gaming-card p-6 space-y-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </h2>

              <PaymentMethodDisplay
                items={items.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image: item.image,
                  category_slug: item.category_slug,
                }))}
                total={finalTotal}
                email={user?.email || ''}
                accessToken={session?.access_token}
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
