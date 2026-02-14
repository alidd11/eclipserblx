import { Link } from 'react-router-dom';
import { ArrowRight, Store, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function LandingCTA() {
  const { t } = useTranslation();

  return (
    <section className="py-6 sm:py-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            {t('landing.readyToStart')}
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            {t('landing.ctaDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/seller">
              <Button size="sm" className="h-9 px-5 text-sm">
                <Store className="mr-1.5 h-3.5 w-3.5" />
                {t('landing.openYourStore')}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/products">
              <Button size="sm" variant="outline" className="h-9 px-5 text-sm">
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                {t('landing.exploreProducts')}
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {t('landing.joinCreators')}
          </p>
        </div>
      </div>
    </section>
  );
}
