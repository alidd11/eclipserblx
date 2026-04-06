import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Shield, Zap, CreditCard, Sparkles } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';
import { CartUpsells } from '@/components/marketplace/CartUpsells';
import { LoyaltyBadge } from '@/components/marketplace/LoyaltyBadge';

export default function Cart() {
  usePageTracking({ pagePath: '/cart' });
  usePageMeta({ title: 'Your Cart', description: 'Review items in your Eclipse cart before checkout. Secure payments, instant delivery.', canonicalPath: '/cart' });
  const { t } = useTranslation();
  const { items, removeItem, clearCart, total } = useCart();
  const { isSubscribed, getMemberPrice, isEligibleForDiscount, getDiscountPercent, isLoading: subscriptionLoading } = useSubscription();
  const { formatPrice } = useCurrency();

  // Calculate member discount (only for eligible items)
  const calculateMemberTotal = () => {
    if (!isSubscribed) return total;
    return items.reduce((sum, item) => {
      const eligible = isEligibleForDiscount(item.category_id, item.is_resellable, item.store_eclipse_enabled);
      const price = eligible ? getMemberPrice(item.price, item.category_id, item.is_resellable) : item.price;
      return sum + price;
    }, 0);
  };

  const memberTotal = calculateMemberTotal();
  const eclipseDiscount = isSubscribed ? total - memberTotal : 0;

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">{t('cart.cartEmpty')}</h1>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            {t('cart.cartEmptyDesc')}
          </p>
          <Button asChild className="gradient-button border-0">
            <Link to="/products">{t('common.browseProducts')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">{t('cart.yourCart')}</h1>
            <LoyaltyBadge />
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
            {t('cart.clearCart')}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-0">
            <h2 className="text-lg font-semibold mb-4">{t('cart.cartItems')}</h2>
            <div className="divide-y divide-border">
              {items.map((item) => {
                const hasDiscount = isSubscribed && isEligibleForDiscount(item.category_id, item.is_resellable, item.store_eclipse_enabled);
                const memberPrice = hasDiscount ? getMemberPrice(item.price, item.category_id, item.is_resellable) : item.price;
                const discountPercent = getDiscountPercent(item.category_id, item.is_resellable);
                
                return (
                  <div key={item.id} className="py-4 first:pt-0">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xl font-bold text-muted-foreground/30">{item.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Link to={`/products/${item.slug}`} className="font-semibold hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base">
                          {item.name}
                        </Link>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {item.store_name ? `${item.store_name} • ` : ''}{t('common.digitalProduct')} • {t('common.instantDelivery')}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {hasDiscount ? (
                          <>
                            <span className="font-bold text-sm sm:text-lg text-primary">{formatPrice(memberPrice)}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] sm:text-xs text-muted-foreground line-through">{formatPrice(item.price)}</span>
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400 border-0">
                                -{discountPercent}%
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <span className="font-bold text-sm sm:text-lg">{formatPrice(item.price)}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="border border-border rounded-xl bg-card p-5 h-fit space-y-5">
              <h2 className="text-lg font-semibold">{t('cart.orderSummary')}</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('cart.subtotal')} ({items.length} {t('cart.items')})</span>
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
                  <span className="text-muted-foreground">{t('cart.discountCode')}</span>
                  <span>{formatPrice(0)}</span>
                </div>
                
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('cart.total')}</span>
                    <span>{formatPrice(memberTotal)}</span>
                  </div>
                  {isSubscribed && eclipseDiscount > 0 && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {t('cart.savingWith', { amount: formatPrice(eclipseDiscount) })}
                    </p>
                  )}
                </div>
              </div>

              <Button asChild className="w-full h-12 gradient-button border-0 shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.35)] transition-shadow">
                <Link to="/checkout">
                  {t('cart.proceedToCheckout')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              {/* Trust signals — compact inline strip */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-border/60">
                {[
                  { icon: Shield, label: t('common.secure') },
                  { icon: Zap, label: t('common.instant') },
                  { icon: CreditCard, label: 'Stripe' },
                ].map((s, i, arr) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                    {i < arr.length - 1 && <span className="hidden sm:block h-3 w-px bg-border/40 ml-2" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Upsells */}
            <CartUpsells />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
