import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useFeaturedProducts, type ScoredProduct } from '@/hooks/useFeaturedProducts';
import { formatGBP } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

interface HeroPick {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string | null;
  storeName: string | null;
  storeLogo: string | null;
  verified: boolean;
}

function toPick(p: ScoredProduct): HeroPick {
  const productNumber = (p as unknown as { product_number?: string | number }).product_number;
  return {
    id: p.id,
    name: p.name,
    slug: productNumber ? String(productNumber) : p.slug,
    price: p.price,
    image: p.images?.[0] ?? null,
    category: p.categories?.name ?? null,
    storeName: p.stores?.name ?? null,
    storeLogo: p.stores?.logo_url ?? null,
    verified: Boolean(p.stores?.is_verified),
  };
}

export function LandingHero() {
  const { data: products } = useFeaturedProducts({ limit: 8, maxPerStore: 5, queryKey: 'landing-hero-editorial' });

  const picks = useMemo(() => (products ?? []).map(toPick).filter((p) => p.image), [products]);
  const hero = picks[0];
  const rail = picks.slice(1, 4);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate border-b border-border"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Masthead */}
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase text-primary">
            <Sparkles className="h-3 w-3" />
            Featured drop
          </div>
          <Link
            to="/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse marketplace
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Editorial split: featured hero product + side rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 lg:h-[400px]">
          {/* Featured hero */}
          <HeroFeature hero={hero} id="hero-heading" />

          {/* Side rail */}
          <div className="flex flex-col gap-3 lg:gap-4 min-h-0">
            {rail.length > 0
              ? rail.slice(0, 3).map((p) => <RailPick key={p.id} pick={p} />)
              : Array.from({ length: 3 }).map((_, i) => <RailSkeleton key={i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFeature({ hero, id }: { hero: HeroPick | undefined; id: string }) {
  if (!hero) {
    return (
      <div className="lg:col-span-2 aspect-[16/10] lg:aspect-auto lg:min-h-[360px] bg-muted/30 border border-border rounded-xl animate-pulse" />
    );
  }

  return (
    <Link
      to={`/products/${hero.slug}`}
      className="group relative lg:col-span-2 flex flex-col lg:flex-row overflow-hidden border border-border bg-card rounded-xl glow-primary-hover"
    >
      {/* Image side — art fills its own panel, never sits under the title text */}
      <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[360px] lg:w-[56%] shrink-0 bg-gradient-to-br from-muted via-muted/70 to-muted overflow-hidden">
        <img
          src={optimizeImageUrl(hero.image, 1200, 750, 'contain')}
          alt={hero.name}
          width={1200}
          height={750}
          loading="eager"
          decoding="sync"
          {...({ fetchpriority: 'high' } as Record<string, string>)}
          className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {/* Seam gradient — blends the image edge into the content panel on desktop */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-card" />
      </div>

      {/* Content panel — solid surface, clear hierarchy, real CTA */}
      <div className="flex-1 flex flex-col justify-center gap-4 p-5 sm:p-7 lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] bg-primary text-primary-foreground rounded-sm">
            Featured
          </span>
          {hero.category && (
            <span className="text-primary text-[10px] font-semibold tracking-[0.2em] uppercase">
              {hero.category}
            </span>
          )}
        </div>

        <h1
          id={id}
          className="font-display font-black tracking-tight leading-[1.05] text-foreground text-[clamp(1.35rem,2.6vw,2.25rem)] max-w-[14ch] line-clamp-3 group-hover:text-primary transition-colors"
        >
          {hero.name}
        </h1>

        <div className="flex items-center gap-3">
          {hero.storeName && (
            <div className="flex items-center gap-2 min-w-0">
              {hero.storeLogo ? (
                <img
                  src={hero.storeLogo}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                />
              ) : null}
              <span className="text-xs font-medium text-muted-foreground truncate">
                {hero.storeName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {formatGBP(hero.price)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)] group-hover:gap-3 transition-all">
            View drop
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function RailPick({ pick }: { pick: HeroPick }) {
  return (
    <Link
      to={`/products/${pick.slug}`}
      className="group flex items-stretch gap-3 border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors flex-1 min-h-0"
    >
      <div className="relative w-28 sm:w-32 shrink-0 bg-gradient-to-br from-muted via-muted/70 to-muted overflow-hidden self-stretch">
        {pick.image ? (
          <img
            src={optimizeImageUrl(pick.image, 320, 240, 'contain')}
            alt={pick.name}
            width={288}
            height={288}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-display font-semibold text-primary/20">
              {pick.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center p-3 pr-4">
        {pick.category && (
          <span className="block text-primary text-[9px] font-bold tracking-[0.2em] uppercase truncate mb-1">
            {pick.category}
          </span>
        )}
        <h3 className={cn(
          'text-foreground text-sm font-semibold leading-snug tracking-tight line-clamp-2',
          'group-hover:text-primary transition-colors'
        )}>
          {pick.name}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-medium truncate">
            {pick.storeName ?? 'Eclipse'}
          </span>
          <span className="text-foreground text-xs font-semibold tracking-tight shrink-0">
            {formatGBP(pick.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RailSkeleton() {
  return (
    <div className="flex items-stretch gap-3 border border-border bg-card overflow-hidden">
      <div className="w-28 sm:w-36 shrink-0 aspect-square bg-muted/40 animate-pulse" />
      <div className="flex-1 p-3 space-y-2">
        <div className="h-2 w-16 bg-muted/40 rounded animate-pulse" />
        <div className="h-4 w-full bg-muted/40 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
      </div>
    </div>
  );
}
