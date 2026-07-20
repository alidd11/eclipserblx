import { Link } from 'react-router-dom';
import { ShoppingBag, Shield, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';
import { CartUpsells } from '@/components/marketplace/CartUpsells';
import { LoyaltyBadge } from '@/components/marketplace/LoyaltyBadge';
import { RecentlyViewedProducts } from '@/components/product/RecentlyViewedProducts';
import { CartTrendingFallback } from '@/components/marketplace/CartTrendingFallback';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

export default function Cart() {
  usePageTracking({ pagePath: '/cart' });
  usePageMeta({ title: 'Your Cart', description: 'Review items in your Eclipse cart before checkout. Secure payments, instant delivery.', canonicalPath: '/cart' });
  const { t } = useTranslation();
  const { items, removeItem, clearCart, total } = useCart();
  const { formatPrice } = useCurrency();
  const { recentlyViewed } = useRecentlyViewed();

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-12 md:py-16 max-w-3xl">
          <div className="border border-border rounded-2xl p-10 md:p-16 flex flex-col items-center text-center bg-card/40">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted/40 border border-border flex items-center justify-center mb-6 md:mb-8">
              <ShoppingBag className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{t('cart.cartEmpty')}</h1>
            <p className="text-muted-foreground mb-8 max-w-[280px] leading-relaxed text-sm">
              {t('cart.cartEmptyDesc')}
            </p>
            <Button asChild variant="outline" className="h-12 px-8 rounded-xl">
              <Link to="/products">{t('common.browseProducts')}</Link>
            </Button>
          </div>
          {recentlyViewed.length > 0 ? <RecentlyViewedProducts /> : <CartTrendingFallback />}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 md:py-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8 md:mb-10 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {t('cart.yourCart')}
              </h1>
              <LoyaltyBadge />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? t('cart.items').replace(/s$/, '') : t('cart.items')} • {t('cart.proceedToCheckout')}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/products" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('common.browseProducts')}
            </Link>
            <button
              onClick={clearCart}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest font-semibold"
            >
              {t('cart.clearCart')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Items list */}
          <div className="lg:col-span-8">
            <div className="space-y-px bg-border rounded-xl overflow-hidden border border-border">
              {items.map((item) => {
                const displayPrice = item.is_pwyw ? (item.custom_price ?? item.price) : item.price;

                return (
                  <div key={item.id} className="bg-background p-5 sm:p-6 flex items-start gap-4 sm:gap-6">
                    {/* Thumbnail */}
                    <Link
                      to={`/products/${item.slug}`}
                      className="w-20 h-20 sm:w-24 sm:h-24 bg-muted/40 rounded-lg overflow-hidden flex-shrink-0 border border-border"
                    >
                      {item.image ? (
                        <img src={optimizeImageUrl(item.image, 96, 96, 'contain')} alt={item.name} className="w-full h-full object-contain object-center" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted-foreground/40">{item.name.charAt(0)}</span>
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <Link
                          to={`/products/${item.slug}`}
                          className="text-foreground font-medium hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base"
                        >
                          {item.name}
                        </Link>
                        <div className="text-right shrink-0">
                          <span className="text-foreground font-medium">{formatPrice(displayPrice)}</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">
                        {item.store_name ? `${item.store_name} • ` : ''}{t('common.digitalProduct')} • {t('common.instantDelivery')}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-muted-foreground/70 hover:text-destructive mt-3 sm:mt-4 transition-colors uppercase tracking-widest font-semibold"
                      >
                        {t('common.remove', { defaultValue: 'Remove' })}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-card/40 border border-border rounded-xl p-6 md:p-8 lg:sticky lg:top-8">
              <h2 className="text-foreground font-semibold mb-6">{t('cart.orderSummary')}</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('cart.subtotal')}</span>
                  <span className="text-foreground">{formatPrice(total)}</span>
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-baseline">
                  <span className="text-foreground font-medium">{t('cart.total')}</span>
                  <span className="text-foreground font-semibold text-lg">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                asChild
                className="w-full h-12 rounded-xl mt-8 gradient-button border-0 shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
              >
                <Link to="/checkout">{t('cart.proceedToCheckout')}</Link>
              </Button>

              {/* Trust signals */}
              <div className="mt-8 space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-widest">
                  <Shield className="h-3.5 w-3.5" />
                  {t('common.secure')} Checkout
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-widest">
                  <Zap className="h-3.5 w-3.5" />
                  {t('common.instant')} Delivery
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="opacity-60">Powered by</span>
                  <span className="font-bold tracking-wider">STRIPE</span>
                </div>
              </div>
            </div>

            <CartUpsells />
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
