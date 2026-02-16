import { Link } from 'react-router-dom';
import { ArrowRight, Store, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LandingCTA() {
  const { t } = useTranslation();

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm font-medium text-foreground hidden sm:block">
          {t('landing.readyToStart')}
        </p>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/seller" className="flex-1 sm:flex-none">
            <Button size="sm" className="h-8 px-4 text-xs w-full sm:w-auto">
              <Store className="mr-1.5 h-3.5 w-3.5" />
              {t('landing.openYourStore')}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/products" className="flex-1 sm:flex-none">
            <Button size="sm" variant="outline" className="h-8 px-4 text-xs w-full sm:w-auto">
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              {t('landing.exploreProducts')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
