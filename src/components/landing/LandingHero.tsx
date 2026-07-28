import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight } from 'lucide-react';
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
  description: string | null;
  verified: boolean;
}

function toPick(p: ScoredProduct): HeroPick {
  const productNumber = (p as unknown as { product_number?: string | number }).product_number;
  const description = (p as unknown as { short_description?: string; description?: string })
    .short_description ?? (p as unknown as { description?: string }).description ?? null;
  return {
    id: p.id,
    name: p.name,
    slug: productNumber ? String(productNumber) : p.slug,
    price: p.price,
    image: p.images?.[0] ?? null,
    category: p.categories?.name ?? null,
    storeName: p.stores?.name ?? null,
    storeLogo: p.stores?.logo_url ?? null,
    description: description ? String(description).replace(/<[^>]*>/g, '').slice(0, 180) : null,
    verified: Boolean(p.stores?.is_verified),
  };
}

/**
 * Framed editorial hero.
 * Single outer frame (hairline border) enclosing:
 *   - Left column (2/3): large featured image atop a metadata panel with title,
 *     description, seller, price and one primary CTA.
 *   - Right column (1/3): "Curated picks" kicker + 3 rail rows, with a quiet
 *     footer link to the marketplace.
 * All colors use semantic tokens. No hardcoded hex, no gradients.
 */
export function LandingHero() {
  const { data: products } = useFeaturedProducts({
    limit: 8,
    maxPerStore: 5,
    queryKey: 'landing-hero-editorial',
  });

  const picks = useMemo(
    () => (products ?? []).map(toPick).filter((p) => p.image),
    [products],
  );
  const hero = picks[0];
  const rail = picks.slice(1, 4);

  return (
    <section aria-labelledby="hero-heading" className="relative isolate">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-16 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border rounded-xl overflow-hidden bg-card/40">
          {/* Left — featured product */}
          <div className="lg:col-span-8 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
            {hero ? (
              <HeroFeature hero={hero} id="hero-heading" />
            ) : (
              <HeroSkeleton />
            )}
          </div>

          {/* Right — curated rail */}
          <aside className="lg:col-span-4 flex flex-col">
            <div className="p-6 lg:p-10 border-b border-border flex-1">
              <h2 className="text-muted-foreground text-[10px] font-bold tracking-[0.3em] uppercase mb-8">
                Curated picks
              </h2>
              <div className="flex flex-col gap-8">
                {rail.length > 0
                  ? rail.map((p) => <RailPick key={p.id} pick={p} />)
                  : Array.from({ length: 3 }).map((_, i) => <RailSkeleton key={i} />)}
              </div>
            </div>
            <div className="p-6 lg:p-10">
              <Link
                to="/marketplace"
                className="group flex items-center justify-between text-foreground text-[10px] font-bold tracking-[0.2em] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              >
                View marketplace
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function HeroFeature({ hero, id }: { hero: HeroPick; id: string }) {
  return (
    <>
      <Link
        to={`/products/${hero.slug}`}
        className="block p-6 lg:p-10 border-b border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={`${hero.name} — featured drop`}
      >
        <div className="w-full aspect-[16/10] bg-muted overflow-hidden rounded-md">
          <img
            src={optimizeImageUrl(hero.image ?? '', 1200, 750, 'contain')}
            srcSet={[
              `${optimizeImageUrl(hero.image ?? '', 480, 300, 'contain', 76)} 480w`,
              `${optimizeImageUrl(hero.image ?? '', 800, 500, 'contain', 78)} 800w`,
              `${optimizeImageUrl(hero.image ?? '', 1200, 750, 'contain', 80)} 1200w`,
            ].join(', ')}
            sizes="(max-width: 1023px) calc(100vw - 2rem), min(67vw, 880px)"
            alt={hero.name}
            width={1200}
            height={750}
            loading="eager"
            decoding="async"
            {...({ fetchpriority: 'high' } as Record<string, string>)}
            className="w-full h-full object-contain object-center transition-opacity duration-200 hover:opacity-95"
          />
        </div>
      </Link>

      <div className="p-6 lg:p-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-md min-w-0">
          <span className="inline-block text-primary text-[10px] font-semibold tracking-[0.2em] uppercase mb-4">
            Featured drop
          </span>
          <h1
            id={id}
            className="font-display text-foreground text-3xl md:text-4xl lg:text-5xl font-light leading-[0.98] mb-5 tracking-tight"
          >
            {hero.name}
          </h1>
          {hero.description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
              {hero.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
          {hero.storeName && (
            <div className="text-left md:text-right">
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">
                Created by
              </p>
              <div className="flex items-center gap-2 min-w-0 md:justify-end">
              {hero.storeLogo ? (
                <img
                  src={optimizeImageUrl(hero.storeLogo, 48, 48, 'cover', 76)}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                  decoding="async"
                  className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                />
              ) : null}
              <p className="text-foreground text-base font-medium truncate max-w-[16ch]">
                {hero.storeName}
              </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-6">
            <span className="font-display text-foreground text-2xl md:text-3xl font-light tracking-tight">
              {formatGBP(hero.price)}
            </span>
            <Link
              to={`/products/${hero.slug}`}
              className="inline-flex items-center px-6 md:px-8 py-3 md:py-4 bg-primary text-primary-foreground text-[11px] font-bold tracking-[0.15em] uppercase rounded-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              View drop
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function RailPick({ pick }: { pick: HeroPick }) {
  return (
    <Link
      to={`/products/${pick.slug}`}
      className={cn(
        'group flex gap-5 items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm',
      )}
    >
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-muted overflow-hidden rounded-sm">
        {pick.image ? (
          <img
            src={optimizeImageUrl(pick.image, 320, 240, 'contain')}
            srcSet={[
              `${optimizeImageUrl(pick.image, 192, 144, 'contain', 74)} 192w`,
              `${optimizeImageUrl(pick.image, 320, 240, 'contain', 76)} 320w`,
            ].join(', ')}
            sizes="(max-width: 1023px) 8rem, 7rem"
            alt={pick.name}
            width={240}
            height={240}
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
      <div className="flex flex-col justify-center min-w-0">
        {pick.category && (
          <span className="text-primary text-[9px] tracking-widest uppercase mb-1 font-semibold truncate">
            {pick.category}
          </span>
        )}
        <h3 className="font-display text-foreground text-base font-medium leading-tight mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
          {pick.name}
        </h3>
        <p className="text-muted-foreground text-sm">{formatGBP(pick.price)}</p>
      </div>
    </Link>
  );
}

function HeroSkeleton() {
  return (
    <>
      <div className="p-6 lg:p-10 border-b border-border">
        <div className="w-full aspect-[16/10] bg-muted/50 rounded-md animate-pulse" />
      </div>
      <div className="p-6 lg:p-10 space-y-4">
        <div className="h-2 w-24 bg-muted/50 rounded animate-pulse" />
        <div className="h-10 w-3/4 bg-muted/50 rounded animate-pulse" />
        <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
      </div>
    </>
  );
}

function RailSkeleton() {
  return (
    <div className="flex gap-5 items-start">
      <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-muted/50 rounded-sm animate-pulse" />
      <div className="flex-1 space-y-2 py-2">
        <div className="h-2 w-16 bg-muted/50 rounded animate-pulse" />
        <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-muted/40 rounded animate-pulse" />
      </div>
    </div>
  );
}
