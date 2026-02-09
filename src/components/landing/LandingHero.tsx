import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { HeroProductShowcase } from './HeroProductShowcase';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';

const POPULAR_SEARCHES = [
  'scripts',
  'maps',
  'ui',
  'weapons',
  'vehicles',
  'admin',
  'tools',
  'free',
];

export function LandingHero() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSearchClick = (term: string) => {
    navigate(`/marketplace?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden min-h-[500px] md:min-h-[550px] lg:min-h-[600px]">
      <HeroBanner />

      <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 relative z-10">
        <div className="w-full">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium mb-4">
                <Store className="h-4 w-4" />
                {t('landing.badge')}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight mb-4">
                {t('landing.headline')}{' '}
                <span className="text-primary">{t('landing.headlineHighlight')}</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
                {t('landing.description')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="max-w-4xl mx-auto mb-6"
            >
              <ActiveOffersCard />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
            >
              <Link to="/marketplace">
                <Button size="default" className="h-10 px-5">
                  <Store className="mr-2 h-4 w-4" />
                  {t('landing.startSelling')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="default" variant="outline" className="h-10 px-5">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {t('landing.browseMarketplace')}
                </Button>
              </Link>
              <Link to="/eclipse-plus">
                <Button 
                  size="default" 
                  variant="ghost" 
                  className="h-10 px-5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Eclipse+
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" />
                {t('landing.popular')}
              </span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearchClick(term)}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {term}
                </button>
              ))}
            </motion.div>
          </div>

          <div className="hidden lg:block mt-8">
            <HeroProductShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
