import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { PWAFeaturedStores } from '@/components/landing/PWAFeaturedStores';
import { PWAFeaturedProducts } from '@/components/landing/PWAFeaturedProducts';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';

export function PWALandingHero() {
  const { t } = useTranslation();

  return (
    <div 
      className="flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative overflow-hidden">
        <HeroBanner />
        
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-center leading-tight tracking-tight mb-3">
            {t('landing.pwaHeadline')}{' '}
            <span className="text-primary">{t('landing.pwaHeadlineHighlight')}</span>
          </h1>

          <p className="text-muted-foreground text-center text-base max-w-md mb-6 leading-relaxed">
            {t('landing.pwaDescription')}
          </p>

          <div className="w-full max-w-sm space-y-3 mb-8">
            <Link to="/marketplace" className="block">
              <Button size="lg" className="w-full h-14 text-lg font-semibold rounded-full">
                <ShoppingBag className="mr-2 h-5 w-5" />
                {t('landing.shop')}
              </Button>
            </Link>
            
            <Link to="/seller" className="block">
              <Button size="lg" variant="outline" className="w-full h-14 text-lg font-semibold rounded-full">
                <Store className="mr-2 h-5 w-5" />
                {t('landing.openAStore')}
              </Button>
            </Link>
          </div>

          <div className="w-full px-0 space-y-6 pb-6">
            <PWAFeaturedStores />
            <ActiveOffersCard />
            <PWAFeaturedProducts />
          </div>
        </div>
      </div>
    </div>
  );
}
