import { useNavigate } from 'react-router-dom';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Store, Sparkles, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/use-mobile';

// Lazy-load framer-motion only when animations are needed (desktop + no reduced motion)
const MotionWordRotator = lazy(() => import('./MotionWordRotator'));

const TRENDING_TAGS = [
  { label: 'scripts', type: 'category' as const, target: 'scripts-systems' },
  { label: 'maps', type: 'category' as const, target: 'maps' },
  { label: 'ui', type: 'category' as const, target: 'roblox-ui' },
  { label: 'vehicles', type: 'search' as const, target: 'vehicles' },
  { label: 'weapons', type: 'search' as const, target: 'weapons' },
  { label: 'admin', type: 'search' as const, target: 'admin' },
  { label: 'tools', type: 'search' as const, target: 'tools' },
];

function StaticWord({ word }: { word: string }) {
  return <span className="absolute left-0">{word}</span>;
}

export function LandingHero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const skipAnimation = reducedMotion || isMobile;

  const rotatingWords = ['Roblox', 'Discord'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const handleTagClick = (tag: typeof TRENDING_TAGS[number]) => {
    if (tag.type === 'category') {
      navigate(`/products?category=${tag.target}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(tag.target)}`);
    }
  };

  const wordRotator = (
    <span className="text-primary relative inline-flex overflow-hidden" style={{ height: '1.2em' }}>
      <span className="invisible">{rotatingWords.reduce((a, b) => a.length > b.length ? a : b)}</span>
      {skipAnimation ? (
        <StaticWord word={rotatingWords[wordIndex]} />
      ) : (
        <Suspense fallback={<StaticWord word={rotatingWords[wordIndex]} />}>
          <MotionWordRotator words={rotatingWords} index={wordIndex} />
        </Suspense>
      )}
    </span>
  );

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden" style={{ minHeight: '320px' }}>
      <HeroBanner />

      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
        {/* Desktop: centered layout */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 mb-3">
            Roblox & Discord Marketplace
          </p>

          <h1 id="hero-heading" className="font-display text-3xl lg:text-[2.5rem] font-bold leading-[1.1] tracking-tight mb-4 max-w-2xl">
            The All-in-One Marketplace for {wordRotator} Creators.
          </h1>

          <p className="text-sm text-foreground/70 max-w-md mb-6 leading-relaxed">
            Buy and sell premium scripts, models, UI kits and game assets. Lower fees, instant delivery, trusted by thousands of creators.
          </p>

          {/* CTA hierarchy */}
          <div className="flex items-center gap-6 mb-6">
            <Link to="/products">
              <Button size="sm" className="h-9 px-5 text-xs font-semibold uppercase tracking-wide">
                Browse Marketplace
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link
              to="/sell"
              className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Store className="h-3.5 w-3.5" />
              Start selling
            </Link>
            <Link
              to="/eclipse-plus"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="relative">Eclipse+</span>
            </Link>
          </div>

          {/* Search tags */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center" role="navigation" aria-label="Trending searches">
            <span className="text-[10px] text-foreground/60 mr-1">
              Trending:
            </span>
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => handleTagClick(tag)}
                className="text-[11px] px-2 py-0.5 rounded-sm border border-border/50 text-foreground/70 hover:text-foreground hover:border-border transition-colors"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: centered layout */}
        <div className="lg:hidden w-full flex flex-col items-center">
          <div className="text-center max-w-md">
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-[1.15] tracking-tight mb-3">
              The All-in-One Marketplace for {wordRotator} Creators.
            </h1>
            <p className="text-sm text-foreground/70 mx-auto mb-5 leading-relaxed">
              Buy and sell premium scripts, models, UI kits and game assets. Lower fees, instant delivery.
            </p>

            <div className="space-y-2.5 mb-5">
              <Link to="/products" className="block">
                <Button size="sm" className="w-full h-10 text-sm font-semibold uppercase tracking-wide">
                  Browse Marketplace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/sell" className="block">
                <Button size="sm" variant="outline" className="w-full h-10 text-sm font-semibold uppercase tracking-wide">
                  <Store className="mr-2 h-4 w-4" />
                  Open a Store
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5 overflow-hidden" role="navigation" aria-label="Trending searches">
              <span className="text-[11px] text-foreground/60 flex items-center gap-1 flex-shrink-0">
                <Search className="h-3 w-3" aria-hidden="true" />
                Trending
              </span>
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => handleTagClick(tag)}
                  className="text-[11px] px-2.5 py-1 min-h-[28px] rounded bg-muted/50 hover:bg-muted text-foreground/70 hover:text-foreground transition-colors flex-shrink-0"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
