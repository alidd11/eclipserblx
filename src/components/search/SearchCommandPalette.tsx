import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Search, Sparkles, Loader2,
  Clock, X, TrendingUp, ArrowRight, ArrowLeft, Store
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hapticTap } from '@/lib/haptics';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { useCurrency } from '@/hooks/useCurrency';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchCategoryChips } from './SearchCategoryChips';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
  product_number?: string | number;
}

interface StoreResult {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean;
}

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommandPalette({ open, onOpenChange }: SearchCommandPaletteProps) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResult[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { searches: recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();

  const { search: smartSearch, isSearching: isSmartSearching, results: smartResults } = useSmartSearch();

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      // Small delay for animation
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    } else {
      setSearchQuery('');
      setUseAI(false);
      setStoreResults([]);
      setCategoryFilter(null);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch trending products on open
  useEffect(() => {
    if (!open) return;
    if (trendingProducts.length > 0) return;

    const fetchTrending = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, product_number, price, images, stores (is_active)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(6);

      if (data) {
        const filtered = data.filter((p: any) => p.stores?.is_active === true);
        setTrendingProducts(filtered.slice(0, 6));
      }
    };
    fetchTrending();
  }, [open, trendingProducts.length]);

  // Search products
  useEffect(() => {
    if (!open || useAI) return;

    const fetchProducts = async () => {
      if (searchQuery.length < 2) {
        setProducts([]);
        setStoreResults([]);
        return;
      }

      setIsLoading(true);
      try {
        let productQuery = supabase
          .from('products')
          .select('id, name, slug, product_number, price, images, stores!inner (is_active), categories!inner (slug)')
          .eq('is_active', true)
          .eq('stores.is_active', true)
          .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .order('total_sales', { ascending: false })
          .limit(8);

        if (categoryFilter) {
          productQuery = productQuery.eq('categories.slug', categoryFilter);
        }

        const [productRes, storeRes] = await Promise.all([
          productQuery,
          supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_verified')
            .eq('status', 'approved')
            .eq('is_active', true)
            .ilike('name', `%${searchQuery}%`)
            .limit(4),
        ]);

        if (!productRes.error && productRes.data) {
          setProducts(productRes.data.slice(0, 6));
        }
        if (!storeRes.error && storeRes.data) {
          setStoreResults(storeRes.data as StoreResult[]);
        }
      } catch {
        console.error('Error fetching search results');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 150);
    return () => clearTimeout(debounce);
  }, [searchQuery, open, useAI, categoryFilter]);

  const displayProducts = useAI && smartResults.length > 0 ? smartResults : products;
  const displayLoading = useAI ? isSmartSearching : isLoading;
  const hasQuery = searchQuery.length >= 2;

  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-primary font-semibold">{part}</span>
      ) : part
    );
  }, []);

  const handleSelect = useCallback((href: string) => {
    hapticTap();
    onOpenChange(false);
    navigate(href);
  }, [navigate, onOpenChange]);

  const handleViewAllResults = useCallback(() => {
    if (searchQuery.trim()) addSearch(searchQuery.trim());
    hapticTap();
    onOpenChange(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  }, [searchQuery, navigate, onOpenChange, addSearch]);

  const handleRecentSearchClick = useCallback((query: string) => {
    hapticTap();
    setSearchQuery(query);
  }, []);

  const handleClose = useCallback(() => {
    hapticTap();
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col",
        "animate-in fade-in duration-200",
        "sm:slide-in-from-bottom-0",
        "slide-in-from-bottom-4"
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-background">
        <button
          onClick={handleClose}
          className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted active:scale-[0.97] transition-all touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setUseAI(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasQuery) handleViewAllResults();
            }}
            placeholder="Search assets..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
            className="w-full h-10 pl-9 pr-10 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            style={{ WebkitUserSelect: 'text' }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
            >
              <X className="h-3 w-3 text-foreground" />
            </button>
          )}
        </div>

        {/* AI toggle */}
        {searchQuery.length >= 3 && !useAI && (
          <button
            onClick={() => {
              hapticTap();
              setUseAI(true);
              smartSearch(searchQuery);
            }}
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-all active:scale-[0.97] touch-manipulation"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </button>
        )}
        {useAI && isSmartSearching && (
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-medium">AI</span>
          </div>
        )}
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-6">

          {/* Recent searches — horizontal pills */}
          {!hasQuery && recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Recent</h3>
                <button
                  onClick={() => { hapticTap(); clearAll(); }}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {recentSearches.map((query) => (
                  <button
                    key={query}
                    onClick={() => handleRecentSearchClick(query)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all active:scale-[0.97] touch-manipulation group"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                    <span>{query}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); hapticTap(); removeSearch(query); }}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-background/50 transition-all"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {!hasQuery && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Categories</h3>
              <SearchCategoryChips selected={categoryFilter} onSelect={(slug) => { setCategoryFilter(slug); }} />
            </section>
          )}

          {/* Category chips when searching */}
          {hasQuery && (
            <SearchCategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
          )}

          {/* Loading state */}
          {displayLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-muted" />
                <Loader2 className="h-10 w-10 animate-spin text-primary absolute inset-0" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {useAI ? 'AI is searching...' : 'Searching...'}
              </span>
            </div>
          )}

          {/* No results */}
          {!displayLoading && hasQuery && displayProducts.length === 0 && storeResults.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                <Search className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse categories</p>
              </div>
            </div>
          )}

          {/* Trending — shown when no query */}
          {!hasQuery && !displayLoading && trendingProducts.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Trending</h3>
              <div className="space-y-1">
                {trendingProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelect(`/products/${(product as any).product_number}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors active:scale-[0.99] touch-manipulation text-left"
                  >
                    <TrendingUp className="h-3.5 w-3.5 text-primary/50 shrink-0" />
                    <ProductRow product={product} formatPrice={formatPrice} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Product results */}
          {!displayLoading && displayProducts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {useAI ? 'AI Results' : 'Products'}
                </h3>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {displayProducts.length}
                </span>
              </div>
              <div className="space-y-1">
                {displayProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      addSearch(searchQuery);
                      handleSelect(`/products/${(product as any).product_number}`);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors active:scale-[0.99] touch-manipulation text-left"
                  >
                    {useAI && <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />}
                    <ProductRow
                      product={product}
                      formatPrice={formatPrice}
                      highlightMatch={hasQuery ? (text: string) => highlightMatch(text, searchQuery) : undefined}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Store results */}
          {!displayLoading && storeResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Stores</h3>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{storeResults.length}</span>
              </div>
              <div className="space-y-1">
                {storeResults.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelect(`/store/${store.slug}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors active:scale-[0.99] touch-manipulation text-left"
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">
                        {highlightMatch(store.name, searchQuery)}
                      </span>
                    </div>
                    {store.is_verified && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">Verified</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* View all results CTA */}
          {!displayLoading && hasQuery && (displayProducts.length > 0 || storeResults.length > 0) && (
            <button
              onClick={handleViewAllResults}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/50 hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-all active:scale-[0.99] touch-manipulation"
            >
              View all results for "{searchQuery}"
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Product row sub-component ── */
function ProductRow({ product, formatPrice, highlightMatch }: {
  product: Product;
  formatPrice: (price: number) => string;
  highlightMatch?: (text: string) => React.ReactNode;
}) {
  const img = product.images?.[0];
  return (
    <>
      {img ? (
        <img
          src={img}
          alt=""
          className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">
          {highlightMatch ? highlightMatch(product.name) : product.name}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
        {formatPrice(product.price)}
      </span>
    </>
  );
}
