import { useNavigate } from 'react-router-dom';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Store, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroBanner } from './HeroBanner';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsMobile } from '@/hooks/use-mobile';

const MotionWordRotator = lazy(() => import('./MotionWordRotator'));

function StaticWord({ word }: { word: string }) {
  return <span className="absolute left-0">{word}</span>;
}

export function LandingHero() {
  const navigate = useNavigate();
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
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <HeroBanner />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 relative z-10">
        {/* Desktop: centered layout */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:text-center">
          <h1 id="hero-heading" className="font-display text-3xl lg:text-5xl font-bold leading-[1.08] tracking-tight mb-4 max-w-2xl drop-shadow-md">
            The Marketplace for {wordRotator} Creators
          </h1>

          <p className="text-sm text-foreground/60 max-w-md mb-6 leading-relaxed">
            Premium scripts, models, UI kits and game assets. Lower fees, instant delivery.
          </p>

          <div className="flex items-center gap-4 mt-2">
            <Link to="/products">
              <Button size="lg" className="h-11 px-7 text-sm font-semibold transition-colors">
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
        </div>

        {/* Mobile: compact layout */}
        <div className="lg:hidden w-full flex flex-col items-center px-2">
          <h1 className="font-display text-xl sm:text-2xl font-bold leading-[1.15] tracking-tight mb-3 text-center">
            The Marketplace for {wordRotator} Creators
          </h1>

          <div className="flex items-center gap-2.5 w-full max-w-sm mt-1">
            <Link to="/products" className="flex-1">
              <Button size="sm" className="w-full h-9 text-xs font-semibold shadow-[0_0_16px_hsl(var(--primary)/0.25)]">
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
        </div>
      </div>
    </section>
  );
}
