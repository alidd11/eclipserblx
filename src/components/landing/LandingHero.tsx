import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { cn } from '@/lib/utils';

const ROTATING_WORDS = ['Roblox', 'Discord'];

export function LandingHero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: products } = useFeaturedProducts({ limit: 6, queryKey: 'landing-hero-bg' });

  const backdrops = useMemo(
    () => (products ?? []).map((p) => ({
      image: p.images?.[0] ?? null,
      name: p.name,
      store: p.stores?.name ?? null,
      slug: (p as unknown as { product_number?: string | number }).product_number
        ? String((p as unknown as { product_number: string | number }).product_number)
        : p.slug,
    })).filter((b) => b.image),
    [products]
  );

  useEffect(() => {
    const t = setInterval(() => setWordIndex((p) => (p + 1) % ROTATING_WORDS.length), 3800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (backdrops.length < 2) return;
    const t = setInterval(() => setBgIndex((p) => (p + 1) % backdrops.length), 6500);
    return () => clearInterval(t);
  }, [backdrops.length]);

  const current = backdrops[bgIndex];
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden -mt-px"
    >
      {/* Full-bleed rotating backdrop — heavily dimmed & blurred */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {backdrops.length > 0 ? (
          backdrops.map((b, i) => (
            <div
              key={b.slug + i}
              className={cn(
                'absolute inset-0 bg-center bg-cover transition-opacity duration-[1600ms] ease-out',
                i === bgIndex ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                backgroundImage: `url(${b.image})`,
                filter: 'blur(24px) saturate(1.1)',
                transform: 'scale(1.1)',
              }}
            />
          ))
        ) : null}
        {/* Heavy dimming layers */}
        <div className="absolute inset-0 bg-background/85" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 55% at 50% 45%, hsl(var(--primary) / 0.18), transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 50%, transparent 40%, hsl(var(--background) / 0.7) 75%, hsl(var(--background)) 100%)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-20 lg:pb-24 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="mb-7 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card/80 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            The Creator Marketplace
          </span>
        </div>

        {/* Headline — inline rotating word */}
        <h1
          id="hero-heading"
          className="font-display font-black tracking-tight leading-[1.02] text-[clamp(2.5rem,6.4vw,4.75rem)] max-w-[20ch]"
        >
          <span className="text-foreground">The Marketplace for </span>
          <span className="relative inline-block align-baseline">
            <span
              key={ROTATING_WORDS[wordIndex]}
              className="inline-block animate-fade-in"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {ROTATING_WORDS[wordIndex]}
            </span>
          </span>
          <br />
          <span className="text-foreground">Creators</span>
        </h1>

        <p className="mt-6 max-w-xl text-sm sm:text-base text-muted-foreground">
          Discover premium assets, scripts, models and systems built by the community's top creators.
        </p>

        {/* Search + secondary CTA */}
        <form
          onSubmit={submit}
          className="mt-8 w-full max-w-2xl flex flex-col sm:flex-row items-stretch gap-3"
        >
          <div
            className="relative flex-1 group"
            onClick={() => inputRef.current?.focus()}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets, scripts, creators…"
              aria-label="Search the marketplace"
              className="w-full h-14 pl-11 pr-32 rounded-xl border border-border bg-card/80 backdrop-blur-md text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:bg-card transition-colors"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 text-xs font-bold uppercase tracking-[0.14em]"
            >
              Search
            </Button>
          </div>
          <Link
            to="/sell"
            className="group inline-flex items-center justify-center gap-2 h-14 px-6 rounded-xl border border-border bg-card/60 backdrop-blur-md text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-card transition-colors whitespace-nowrap"
          >
            Start selling
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </form>

        {/* Category tiles */}
        <div className="mt-10 w-full max-w-3xl grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {CATEGORY_TILES.map(({ label, slug, icon: Icon }) => (
            <Link
              key={slug}
              to={`/products?category=${slug}`}
              className="group flex flex-col items-center justify-center gap-1.5 px-2 py-3 sm:py-4 rounded-xl border border-border bg-card/60 backdrop-blur-md hover:border-primary/40 hover:bg-card transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[11px] sm:text-xs font-semibold text-foreground/80 group-hover:text-foreground">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom-right attribution */}
      {current?.name && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10 max-w-[60%] text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Featured</div>
          <Link
            to={`/products/${current.slug}`}
            className="text-xs sm:text-sm font-semibold text-foreground/90 hover:text-primary transition-colors line-clamp-1"
          >
            {current.name}
            {current.store ? <span className="text-muted-foreground font-normal"> · {current.store}</span> : null}
          </Link>
        </div>
      )}
    </section>
  );
}
