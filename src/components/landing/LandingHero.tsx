import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroProductShowcase } from './HeroProductShowcase';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';
import { useSellerStatus } from '@/hooks/useSellerStatus';

const POPULAR_SEARCHES = [
  'scripts',
  'maps',
  'ui',
  'weapons',
  'vehicles',
  'admin',
  'tools',
];

export function LandingHero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isSeller } = useSellerStatus();

  const handleSearchClick = (term: string) => {
    navigate(`/products?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden">
      <HeroBanner />

      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
        <div className="w-full flex flex-col lg:flex-row lg:items-start lg:gap-12">
          {/* Left: Text content — left-aligned on desktop */}
          <div className="lg:flex-1 lg:max-w-xl">

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-[1.15] tracking-tight mb-3">
              {t('landing.headline')}{' '}
              <span className="text-primary">{t('landing.headlineHighlight')}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-5 leading-relaxed">
              {t('landing.description')}
            </p>

            <div className="flex justify-center items-center gap-2 mb-5">
              <Link to="/products">
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                  <ShoppingBag className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('landing.browseMarketplace')}</span>
                  <span className="sm:hidden">Browse</span>
                </Button>
              </Link>
              {!isSeller && (
              <Link to="/seller">
                  <Button size="sm" className="h-8 px-3 text-xs">
                    <Store className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t('landing.startSelling')}</span>
                    <span className="sm:hidden">Sell</span>
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              )}
              <Link to="/eclipse-plus">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-3 text-xs text-amber-500 border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:mr-1.5" />
                  Eclipse+
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5 overflow-hidden">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <Search className="h-3 w-3" />
                {t('landing.popular')}
              </span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearchClick(term)}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Active offers card — desktop only */}
          <div className="hidden lg:block lg:flex-1 lg:max-w-md mt-0">
            <ActiveOffersCard />
          </div>

          {/* Mobile: Active offers card below text */}
          <div className="lg:hidden mt-5">
            <ActiveOffersCard />
          </div>
        </div>

        <div className="hidden lg:block mt-8">
          <HeroProductShowcase />
        </div>
      </div>
    </section>
  );
}
