import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STORE_LISTING_COLUMNS } from '@/lib/storeColumns';
import { cn } from '@/lib/utils';
import { 
  Search, ChevronRight, ShieldCheck, Award, Users, Package, 
  Star, TrendingUp, SlidersHorizontal, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';

// ---------- Types ----------

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number | null;
  average_rating: number | null;
  product_count: number | null;
  eclipse_plus_discount_enabled: boolean;
}

type SortOption = 'popular' | 'newest' | 'rating' | 'products' | 'name';

// ---------- Scoring algorithm ----------

function scoreStore(store: StoreData): number {
  return (
    (store.is_trusted ? 100 : 0) +
    (store.is_verified ? 50 : 0) +
    (store.follower_count || 0) * 0.1 +
    (store.average_rating || 0) * 12 +
    (store.product_count || 0) * 0.5 +
    Math.random() * 15
  );
}

// ---------- Data hooks ----------

function useAllStores() {
  return useQuery({
    queryKey: ['all-stores-page'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(STORE_LISTING_COLUMNS)
        .eq('is_active', true)
        .eq('is_testing', false)
        .order('follower_count', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as StoreData[]).map(s => ({ ...s, score: scoreStore(s) }));
    },
    staleTime: 1000 * 60 * 2,
  });
}

function useStoreCategories() {
  return useQuery({
    queryKey: ['store-category-chips'],
    queryFn: async () => {
      // Only fetch parent categories that have at least one active approved product
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

function useStoreCategoryMap(categoryId: string | null) {
  return useQuery({
    queryKey: ['store-ids-by-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      // Get all category IDs (parent + children) for this parent
      const { data: childCats } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', categoryId);
      const catIds = [categoryId, ...(childCats?.map(c => c.id) || [])];
      
      // Get distinct store_ids that have products in these categories
      const { data, error } = await supabase
        .from('products')
        .select('store_id')
        .in('category_id', catIds)
        .eq('is_active', true)
        .eq('moderation_status', 'approved');
      if (error) throw error;
      return new Set(data?.map(p => p.store_id).filter(Boolean));
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 2,
  });
}

// ---------- Components ----------

function SpotlightCard({ store }: { store: StoreData }) {
  return (
    <Link
      to={`/store/${store.slug}`}
      className="group relative block rounded-lg overflow-hidden border border-border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="relative h-36 sm:h-44 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {store.is_trusted && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-semibold">
              <Award className="h-3.5 w-3.5" />Trusted
            </span>
          )}
          {store.is_verified && !store.is_trusted && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[11px] font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />Verified
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
          <div className="w-14 h-14 rounded-xl bg-card border-2 border-card overflow-hidden shadow-lg flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold bg-muted text-muted-foreground">
                {store.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h3 className="font-bold text-lg text-white truncate">{store.name}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              {store.average_rating ? (
                <span className="text-sm text-white/80">
                  <span className="text-amber-400">★</span> {store.average_rating.toFixed(1)}
                </span>
              ) : null}
              {(store.follower_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/60">
                  <Users className="h-3.5 w-3.5" />{store.follower_count}
                </span>
              )}
              {(store.product_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-sm text-white/60">
                  <Package className="h-3.5 w-3.5" />{store.product_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {store.description && (
        <div className="px-4 py-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{store.description}</p>
        </div>
      )}
    </Link>
  );
}

function StoreCard({ store }: { store: StoreData }) {
  return (
    <Link
      to={`/store/${store.slug}`}
      className="group block rounded-lg overflow-hidden border border-border bg-card transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <div className="relative h-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {store.is_trusted && <Award className="h-3.5 w-3.5 text-amber-400" />}
          {store.is_verified && !store.is_trusted && <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />}
        </div>
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end gap-2">
          <div className="w-9 h-9 rounded-lg bg-card border border-card overflow-hidden shadow-sm flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                {store.name.charAt(0)}
              </div>
            )}
          </div>
          <h4 className="font-semibold text-sm text-white truncate pb-0.5">{store.name}</h4>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {store.average_rating ? (
            <span className="text-xs text-muted-foreground">
              <span className="text-amber-400">★</span> {store.average_rating.toFixed(1)}
            </span>
          ) : null}
          {(store.follower_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />{store.follower_count}
            </span>
          )}
          {(store.product_count ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Package className="h-3 w-3" />{store.product_count}
            </span>
          )}
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function StoreSkeleton({ large }: { large?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className={large ? "h-36 sm:h-44 rounded-none" : "h-20 rounded-none"} />
      <div className="px-3 py-2.5 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function AllStores() {
  return (
    <SearchCommandProvider>
      <AllStoresContent />
    </SearchCommandProvider>
  );
}

function AllStoresContent() {
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();
  const { data: stores, isLoading } = useAllStores();
  const { data: categories } = useStoreCategories();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('popular');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: categoryStoreIds, isLoading: isCategoryLoading } = useStoreCategoryMap(selectedCategory);

  // Derive spotlight, trending, and grid stores
  const { spotlightStores, trendingStores, gridStores } = useMemo(() => {
    if (!stores?.length) return { spotlightStores: [], trendingStores: [], gridStores: [] };

    let filtered = stores;

    // Category filter via products
    if (selectedCategory && categoryStoreIds) {
      filtered = filtered.filter(s => categoryStoreIds.has(s.id));
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sort) {
      case 'popular':
        sorted.sort((a, b) => b.score - a.score);
        break;
      case 'newest':
        // Stores don't have created_at in listing columns, fall back to score
        sorted.sort((a, b) => b.score - a.score);
        break;
      case 'rating':
        sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
      case 'products':
        sorted.sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    // When searching, skip spotlight/trending
    if (search.trim()) {
      return { spotlightStores: [], trendingStores: [], gridStores: sorted };
    }

    // Spotlight: top 3 by score (trusted/verified preferred)
    const spotlight = sorted.slice(0, 3);
    
    // Trending: stores with high follower count not already in spotlight
    const spotlightIds = new Set(spotlight.map(s => s.id));
    const trending = sorted
      .filter(s => !spotlightIds.has(s.id) && (s.follower_count || 0) > 0)
      .slice(0, 6);
    
    const usedIds = new Set([...spotlightIds, ...trending.map(s => s.id)]);
    const grid = sorted.filter(s => !usedIds.has(s.id));

    return { spotlightStores: spotlight, trendingStores: trending, gridStores: grid };
  }, [stores, search, sort, selectedCategory, categoryStoreIds]);

  return (
    <SearchCommandProvider>
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Page header */}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              All Stores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discover creators and sellers across the marketplace
            </p>
          </div>

          {/* Search + Sort bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-card border-border"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-10 bg-card border-border">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="products">Most Products</SelectItem>
                <SelectItem value="name">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category chips */}
          {categories?.length ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  !selectedCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          ) : null}

          {(isLoading || (selectedCategory && isCategoryLoading)) ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <StoreSkeleton key={i} large />)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <StoreSkeleton key={i} />)}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Hero Spotlight */}
              {spotlightStores.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Staff Picks
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {spotlightStores.map(store => (
                      <SpotlightCard key={store.id} store={store} />
                    ))}
                  </div>
                </section>
              )}

              {/* Trending / Rising */}
              {trendingStores.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Trending Stores
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {trendingStores.map(store => (
                      <StoreCard key={store.id} store={store} />
                    ))}
                  </div>
                </section>
              )}

              {/* All Stores Grid */}
              {gridStores.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      {search.trim() ? `Results for "${search}"` : 'All Stores'}
                    </h2>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {gridStores.length} store{gridStores.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {gridStores.map(store => (
                      <StoreCard key={store.id} store={store} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {!spotlightStores.length && !trendingStores.length && !gridStores.length && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No stores found</p>
                </div>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </SearchCommandProvider>
  );
}