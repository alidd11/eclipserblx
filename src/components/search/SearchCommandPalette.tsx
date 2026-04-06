import { useState, useEffect, useCallback, useRef } from 'react';
import { sanitizeSearch } from '@/lib/searchUtils';
import { useNavigate } from 'react-router-dom';
import {
  Package, Search, Loader2,
  Clock, X, TrendingUp, ArrowRight, ArrowLeft, Store, ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hapticTap } from '@/lib/haptics';
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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { searches: recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setSearchQuery('');
      setStoreResults([]);
      setCategoryFilter(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open || trendingProducts.length > 0) return;
    const fetchTrending = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, product_number, price, images, stores (is_active)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(8);
      if (data) {
        const filtered = data.filter((p) => p.stores?.is_active === true);
        setTrendingProducts(filtered.slice(0, 6));
      }
    };
    fetchTrending();
  }, [open, trendingProducts.length]);

  useEffect(() => {
    if (!open) return;
    const fetchProducts = async () => {
      if (searchQuery.length < 2) {
        setProducts([]);
        setStoreResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const [rpcRes, storeRes] = await Promise.all([
          supabase.rpc('search_products_v2', {
            search_query: searchQuery,
            category_filter: categoryFilter,
            min_price: null,
            max_price: null,
            free_only: false,
            sort_by: 'relevance',
            page_size: 6,
            page_offset: 0,
          }),
          supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_verified')
            .eq('status', 'approved')
            .eq('is_active', true)
            .ilike('name', `%${sanitizeSearch(searchQuery)}%`)
            .limit(4),
        ]);

        if (!rpcRes.error && rpcRes.data) {
          setProducts(rpcRes.data.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            images: p.images,
            product_number: p.product_number,
          })));
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
  }, [searchQuery, open, categoryFilter]);

  const displayProducts = products;
  const displayLoading = isLoading;
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
    setIsClosing(true);
    setTimeout(() => onOpenChange(false), 150);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col",
        "transition-all duration-200 ease-out",
        isClosing
          ? "opacity-0 translate-y-2"
          : "opacity-100 translate-y-0 animate-in fade-in slide-in-from-bottom-3 duration-200"
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* ── Search bar ── */}
      <header className="shrink-0 px-3 pt-2 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-all touch-manipulation"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && hasQuery) handleViewAllResults(); }}
              placeholder="Search assets..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              className={cn(
                "w-full h-11 pl-10 pr-10 rounded-lg text-sm text-foreground",
                "bg-muted/40 placeholder:text-muted-foreground",
                "outline-none ring-1 ring-primary/50 focus:ring-2 focus:ring-primary/60",
                "transition-all duration-150"
              )}
              style={{ WebkitUserSelect: 'text' }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto w-full">

          {/* ── Idle state ── */}
          {!hasQuery && (
            <>
              {/* Categories */}
              <section className="px-4 pt-2 pb-3">
                <SectionLabel className="mb-2.5">CATEGORIES</SectionLabel>
                <SearchCategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
              </section>

              <div className="h-px bg-border/20 mx-4" />

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <>
                  <section className="px-4 pt-3 pb-1">
                    <div className="flex items-center justify-between mb-1">
                      <SectionLabel>RECENT</SectionLabel>
                      <button
                        onClick={() => { hapticTap(); clearAll(); }}
                        className="text-[11px] font-medium text-muted-foreground/50 hover:text-foreground transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    {recentSearches.map((query) => (
                      <button
                        key={query}
                        onClick={() => handleRecentSearchClick(query)}
                        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors rounded-lg px-1 -mx-1 group"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-muted-foreground">{query}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); hapticTap(); removeSearch(query); }}
                          className="opacity-0 group-hover:opacity-100 sm:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted/60 transition-all shrink-0"
                          aria-label={`Remove "${query}" from recent searches`}
                        >
                          <X className="h-3 w-3 text-muted-foreground/40" />
                        </button>
                      </button>
                    ))}
                  </section>
                  <div className="h-px bg-border/20 mx-4" />
                </>
              )}

              {/* Trending */}
              {trendingProducts.length > 0 && (
                <section className="px-4 pt-3 pb-2">
                  <SectionLabel className="mb-1">TRENDING</SectionLabel>
                  {trendingProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(`/products/${(product as any).product_number}`)}
                      className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors rounded-lg px-1 -mx-1 touch-manipulation"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      <ProductRow product={product} formatPrice={formatPrice} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0" />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}

          {/* ── Active search ── */}
          {hasQuery && (
            <>
              {/* Category filter */}
              <div className="px-4 py-2">
                <SearchCategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
              </div>

              {/* Loading */}
              {displayLoading && (
                <div className="flex items-center justify-center gap-2.5 py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">Searching...</span>
                </div>
              )}

              {/* No results */}
              {!displayLoading && displayProducts.length === 0 && storeResults.length === 0 && (
                <div className="py-16 text-center px-4">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground/50 mt-1.5">Try different keywords or browse categories</p>
                </div>
              )}

              {/* Products */}
              {!displayLoading && displayProducts.length > 0 && (
                <section className="px-4 pt-1 pb-1">
                  {displayProducts.map((product, idx) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        addSearch(searchQuery);
                        handleSelect(`/products/${(product as any).product_number}`);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 py-3 text-left",
                        "hover:bg-muted/30 active:bg-muted/50 transition-colors touch-manipulation",
                        "rounded-lg px-1 -mx-1",
                        "animate-in fade-in slide-in-from-bottom-1 duration-150",
                        idx > 0 && "border-t border-border/10"
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <ProductRow
                        product={product}
                        formatPrice={formatPrice}
                        highlightMatch={(text: string) => highlightMatch(text, searchQuery)}
                      />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0" />
                    </button>
                  ))}
                </section>
              )}

              {/* Stores */}
              {!displayLoading && storeResults.length > 0 && (
                <section className="px-4 pt-2 pb-1">
                  <div className="h-px bg-border/20 -mx-1 mb-2" />
                  <SectionLabel className="mb-1">STORES</SectionLabel>
                  {storeResults.map((store, idx) => (
                    <button
                      key={store.id}
                      onClick={() => handleSelect(`/store/${store.slug}`)}
                      className={cn(
                        "w-full flex items-center gap-3 py-3 text-left",
                        "hover:bg-muted/30 active:bg-muted/50 transition-colors touch-manipulation",
                        "rounded-lg px-1 -mx-1",
                        "animate-in fade-in slide-in-from-bottom-1 duration-150",
                        idx > 0 && "border-t border-border/10"
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {highlightMatch(store.name, searchQuery)}
                        </span>
                      </div>
                      {store.is_verified && (
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">Verified</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0" />
                    </button>
                  ))}
                </section>
              )}

              {/* View all */}
              {!displayLoading && (displayProducts.length > 0 || storeResults.length > 0) && (
                <div className="px-4 py-3">
                  <button
                    onClick={handleViewAllResults}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary/10 hover:bg-primary/15 text-sm font-medium text-primary transition-all touch-manipulation"
                  >
                    <span>View all results</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      "text-[11px] font-semibold tracking-wider text-muted-foreground/40",
      className
    )}>
      {children}
    </h3>
  );
}

/* ── Product row ── */
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
          className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
          <Package className="h-5 w-5 text-muted-foreground/20" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block leading-tight">
          {highlightMatch ? highlightMatch(product.name) : product.name}
        </span>
      </div>
      <span className="text-sm font-semibold text-foreground/80 tabular-nums shrink-0">
        {formatPrice(product.price)}
      </span>
    </>
  );
}
