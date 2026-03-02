import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { StatsCard } from '@/components/home/StatsCard';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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

  const rotatingWords = ['Roblox', 'Discord'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const handleSearchClick = (term: string) => {
    navigate(`/products?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '380px' }}>
      <HeroBanner />

      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
        {/* Desktop: asymmetric two-column layout */}
        <div className="hidden lg:grid lg:grid-cols-[1fr,320px] lg:gap-12 lg:items-start lg:max-w-5xl lg:mx-auto">
          {/* Left — editorial text block */}
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 mb-3">
              Roblox & Discord Marketplace
            </p>

            <h1 className="font-display text-3xl lg:text-[2.5rem] font-bold leading-[1.1] tracking-tight mb-4 max-w-lg">
              {t('landing.headline')}{' '}
              <span className="text-primary relative inline-flex overflow-hidden" style={{ height: '1.2em' }}>
                <span className="invisible">{rotatingWords.reduce((a, b) => a.length > b.length ? a : b)}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="absolute left-0"
                  >
                    {rotatingWords[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>{' '}
              Experience.
            </h1>

            <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
              {t('landing.description')}
            </p>

            {/* CTA hierarchy: one primary, rest are text links */}
            <div className="flex items-center gap-6 mb-6">
              <Link to="/products">
                <Button size="sm" className="h-9 px-5 text-xs font-semibold">
                  Browse Marketplace
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
              {!isSeller && (
                <Link
                  to="/seller"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <Store className="h-3.5 w-3.5" />
                  Start selling
                </Link>
              )}
              <Link
                to="/eclipse-plus"
                className="text-xs font-medium text-amber-500/80 hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Eclipse+
              </Link>
            </div>

            {/* Search tags — flush left, inline */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground/60 mr-1">
                Trending:
              </span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearchClick(term)}
                  className="text-[11px] px-2 py-0.5 rounded-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Right — stats sidebar, offset down for visual weight */}
          <div className="pt-8">
            <StatsCard />
          </div>
        </div>

        {/* Mobile: centered layout (keep existing feel) */}
        <div className="lg:hidden w-full flex flex-col items-center">
          <div className="text-center max-w-md">
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] tracking-tight mb-3">
              {t('landing.headline')}{' '}
              <span className="text-primary relative inline-flex overflow-hidden" style={{ height: '1.2em' }}>
                <span className="invisible">{rotatingWords.reduce((a, b) => a.length > b.length ? a : b)}</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="absolute left-0"
                  >
                    {rotatingWords[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>{' '}
              Experience.
            </h1>
            <p className="text-sm text-muted-foreground mx-auto mb-5 leading-relaxed">
              {t('landing.description')}
            </p>

            <div className="flex justify-center items-center gap-2 mb-5">
              <Link to="/products">
                <Button size="sm" className="h-8 px-3 text-xs">
                  Browse Marketplace
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </Link>
              {!isSeller && (
                <Link to="/seller">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs">
                    <Store className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Sell</span>
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
                Trending
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
        </div>
      </div>
    </section>
  );
}
