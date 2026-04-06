import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBanner } from './HeroBanner';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/use-mobile';

const MotionWordRotator = lazy(() => import('./MotionWordRotator'));

function StaticWord({ word }: { word: string }) {
  return <span className="absolute left-0">{word}</span>;
}

const STATS = ['1,000+ Assets', '200+ Sellers', 'Instant Delivery'];

export function LandingHero() {
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
    <section aria-labelledby="hero-heading" className="relative overflow-hidden min-h-[220px] sm:min-h-[280px] lg:min-h-[380px]">
      <HeroBanner />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20 relative z-10">
        {/* Desktop: centered layout */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:text-center">
          <h1 id="hero-heading" className="font-display text-2xl sm:text-3xl lg:text-[clamp(2.5rem,4vw,3.75rem)] xl:text-6xl font-bold leading-[1.05] tracking-tight mb-4 max-w-4xl drop-shadow-md uppercase">
            The <span className="text-gradient-hero">Marketplace</span> For {wordRotator} Creators
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-foreground/60 max-w-lg mb-6 leading-relaxed">
            Premium scripts, models, UI kits and game assets.<br className="hidden sm:block" /> Lower fees, instant delivery.
          </p>

          <div className="flex items-center gap-4 mt-2">
            <Link to="/products">
              <Button size="lg" className="h-12 px-8 text-sm font-semibold transition-colors">
                Browse Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link
              to="/sell"
              className="text-xs font-medium text-foreground/60 hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Store className="h-3.5 w-3.5" />
              Start selling
            </Link>
          </div>

          {/* Stat strip */}
          <div className="flex items-center gap-3 mt-8">
            {STATS.map((stat, i) => (
              <span key={i} className="text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/50 px-3 py-1 rounded-full">
                {stat}
              </span>
            ))}
          </div>
        </div>

        {/* Mobile: compact layout */}
        <div className="lg:hidden w-full flex flex-col items-center px-2">
          <h1 className="font-display text-[4.2vw] sm:text-2xl font-bold leading-[1.15] tracking-tight mb-3 text-center uppercase whitespace-nowrap">
            The <span className="text-gradient-hero">Marketplace</span> For {wordRotator} Creators
          </h1>

          <div className="flex items-center gap-2.5 w-full max-w-sm mt-1">
            <Link to="/products" className="flex-1">
              <Button size="sm" className="w-full h-9 text-xs font-semibold">
                Browse
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/sell" className="flex-1">
              <Button size="sm" variant="outline" className="w-full h-9 text-xs font-semibold">
                <Store className="mr-1.5 h-3.5 w-3.5" />
                Sell
              </Button>
            </Link>
          </div>

          {/* Stat strip - mobile */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {STATS.map((stat, i) => (
              <span key={i} className="text-[10px] font-medium text-muted-foreground bg-muted/40 border border-border/50 px-2.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {stat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
