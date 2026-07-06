import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const ROTATING_WORDS = ['Roblox', 'Discord'];


export function LandingHero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden isolate"
    >
      {/* Ambient backdrop — radial primary glow + subtle dot grid */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Bottom fade into page bg */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-20 flex flex-col items-center text-center">


        {/* Headline */}
        <h1
          id="hero-heading"
          className="font-display font-black tracking-tighter uppercase leading-[0.9] text-[clamp(2rem,7vw,5rem)] mb-8"
        >
          <span className="block text-foreground/90">The Marketplace For</span>
          <span
            className="block bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(180deg, hsl(var(--foreground)), hsl(var(--foreground) / 0.55))',
            }}
            aria-live="polite"
          >
            {ROTATING_WORDS[wordIndex]}
          </span>
          <span className="block text-foreground/90">Creators</span>
        </h1>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          <Link to="/products">
            <Button
              size="lg"
              className="h-12 px-10 text-xs sm:text-sm font-bold uppercase tracking-[0.18em]"
            >
              Browse Marketplace
            </Button>
          </Link>
          <Link
            to="/sell"
            className="group inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border"
          >
            Start selling
            <ArrowRight className="h-4 w-4 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
