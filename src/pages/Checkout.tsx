import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Lock, ChevronLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsProcessing(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_email: email,
          user_id: user?.id || null,
          subtotal: total,
          total: total,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update order to paid (simulating payment)
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid', payment_method: 'stripe' })
        .eq('id', order.id);

      if (updateError) throw updateError;

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-success?id=${order.id}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process order');
    } finally {
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

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
          {/* Customer Details */}
          <div className="space-y-6">
            <div className="gaming-card p-6 space-y-4">
              <h2 className="text-xl font-display font-bold">Your Details</h2>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Your download links will be sent to this email
                </p>
              </div>
            </div>

            <div className="gaming-card p-6 space-y-4">
              <h2 className="text-xl font-display font-bold">Discount Code</h2>
              <div className="flex gap-2">
                <Input
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="bg-background"
                />
                <Button type="button" variant="outline">Apply</Button>
              </div>
            </div>

            <div className="gaming-card p-6 space-y-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </h2>
              <p className="text-sm text-muted-foreground">
                Demo mode: Click "Complete Order" to simulate a successful payment.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4" />
                Your payment information is secure
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="gaming-card p-6 h-fit space-y-6">
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
                <span>£0.00</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 gradient-button border-0"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : `Complete Order • £${total.toFixed(2)}`}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
