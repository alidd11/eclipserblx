import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';

export default function Cart() {
  const { items, removeItem, clearCart, total } = useCart();

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16 text-center space-y-6">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-3xl font-display font-bold">Your Cart is Empty</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Looks like you haven't added any products yet. Browse our collection to find something you'll love!
          </p>
          <Button asChild className="gradient-button border-0">
            <Link to="/products">Browse Products</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-display font-bold">Your Cart</h1>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
            Clear Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="gaming-card p-4 flex gap-4">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-muted-foreground/30">{item.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.slug}`} className="font-semibold hover:text-primary transition-colors line-clamp-1">
                    {item.name}
                  </Link>
                  <p className="text-muted-foreground text-sm">Digital Product • Instant Delivery</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">£{item.price.toFixed(2)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="gaming-card p-6 h-fit space-y-6">
            <h2 className="text-xl font-display font-bold">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                <span>£{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>£0.00</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button asChild className="w-full h-12 gradient-button border-0">
              <Link to="/checkout">
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
