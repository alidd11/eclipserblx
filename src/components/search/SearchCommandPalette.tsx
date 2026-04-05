import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
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
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch trending
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
        const filtered = data.filter((p: any) => p.stores?.is_active === true);
        setTrendingProducts(filtered.slice(0, 6));
      }
    };
    fetchTrending();
  }, [open, trendingProducts.length]);

  // Search using search_products_v2 RPC for full-text + trigram + description matching
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
            .ilike('name', `%${searchQuery}%`)
            .limit(4),
        ]);

        if (!rpcRes.error && rpcRes.data) {
          setProducts(rpcRes.data.map((p: any) => ({
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
  }, [searchQuery, open, useAI, categoryFilter]);

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

  const totalResults = displayProducts.length + storeResults.length;

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
      {/* ── Header ── */}
      <header className="shrink-0 px-3 pt-2 pb-3 bg-background">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClose}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted active:scale-[0.97] transition-all touch-manipulation"
            aria-label="Close search"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setUseAI(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && hasQuery) handleViewAllResults(); }}
              placeholder="Search assets..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              className={cn(
                "w-full h-11 pl-10 pr-10 rounded-xl text-sm text-foreground",
                "bg-muted/50 placeholder:text-muted-foreground/50",
                "outline-none ring-1 ring-border/40 focus:ring-2 focus:ring-primary/40",
                "transition-all duration-150"
              )}
              style={{ WebkitUserSelect: 'text' }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors active:scale-[0.95]"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* AI toggle */}
          {searchQuery.length >= 3 && !useAI && (
            <button
              onClick={() => { hapticTap(); setUseAI(true); smartSearch(searchQuery); }}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary px-3 py-2 rounded-xl bg-muted/50 hover:bg-primary/5 ring-1 ring-border/30 hover:ring-primary/30 transition-all active:scale-[0.97] touch-manipulation"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI
            </button>
          )}
          {useAI && isSmartSearching && (
            <div className="shrink-0 flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-2 rounded-xl ring-1 ring-primary/20">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="font-medium">AI</span>
            </div>
          )}
        </div>

        {/* Result count bar */}
        {hasQuery && !displayLoading && totalResults > 0 && (
          <div className="mt-2.5 flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground/60">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
            {categoryFilter && (
              <button
                onClick={() => setCategoryFilter(null)}
                className="text-[11px] font-medium text-primary flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear filter
              </button>
            )}
          </div>
        )}
      </header>

      {/* Divider */}
      <div className="h-px bg-border/40" />

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto w-full">

          {/* ── Idle state: recent + categories + trending ── */}
          {!hasQuery && (
            <div className="divide-y divide-border/30">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <section className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Recent</SectionLabel>
                    <button
                      onClick={() => { hapticTap(); clearAll(); }}
                      className="text-[11px] font-medium text-muted-foreground/60 hover:text-foreground transition-colors active:scale-[0.97]"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
                    {recentSearches.map((query) => (
                      <button
                        key={query}
                        onClick={() => handleRecentSearchClick(query)}
                        className="shrink-0 flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] touch-manipulation group"
                      >
                        <Clock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        <span className="font-medium">{query}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); hapticTap(); removeSearch(query); }}
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded-md hover:bg-background/60 transition-all"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Categories */}
              <section className="px-4 py-3.5">
                <SectionLabel className="mb-3">Categories</SectionLabel>
                <SearchCategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
              </section>

              {/* Trending */}
              {trendingProducts.length > 0 && (
                <section className="px-4 py-3.5">
                  <SectionLabel className="mb-1">Trending</SectionLabel>
                  <div className="divide-y divide-border/20">
                    {trendingProducts.map((product, idx) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelect(`/products/${(product as any).product_number}`)}
                        className={cn(
                          "w-full flex items-center gap-3.5 py-3 text-left",
                          "hover:bg-muted/40 active:bg-muted/60 transition-colors active:scale-[0.99] touch-manipulation",
                          "rounded-lg -mx-1 px-1"
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                        <ProductRow product={product} formatPrice={formatPrice} />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── Active search state ── */}
          {hasQuery && (
            <div>
              {/* Category filter chips while searching */}
              <div className="px-4 py-2.5">
                <SearchCategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
              </div>

              <div className="h-px bg-border/30" />

              {/* Loading */}
              {displayLoading && (
                <div className="flex items-center justify-center gap-2.5 py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {useAI ? 'AI is searching...' : 'Searching...'}
                  </span>
                </div>
              )}

              {/* No results */}
              {!displayLoading && displayProducts.length === 0 && storeResults.length === 0 && (
                <div className="py-16 text-center px-4">
                  <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1.5">Try different keywords or browse categories</p>
                </div>
              )}

              {/* Product results */}
              {!displayLoading && displayProducts.length > 0 && (
                <section className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SectionLabel>
                      {useAI ? 'AI Results' : 'Products'}
                    </SectionLabel>
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums font-medium">
                      {displayProducts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {displayProducts.map((product, idx) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          addSearch(searchQuery);
                          handleSelect(`/products/${(product as any).product_number}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3.5 py-3 text-left",
                          "hover:bg-muted/40 active:bg-muted/60 transition-colors active:scale-[0.99] touch-manipulation",
                          "rounded-lg -mx-1 px-1",
                          "animate-in fade-in slide-in-from-bottom-1 duration-200"
                        )}
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        {useAI && <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />}
                        <ProductRow
                          product={product}
                          formatPrice={formatPrice}
                          highlightMatch={(text: string) => highlightMatch(text, searchQuery)}
                        />
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Store results */}
              {!displayLoading && storeResults.length > 0 && (
                <>
                  <div className="h-px bg-border/30" />
                  <section className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <SectionLabel>Stores</SectionLabel>
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums font-medium">{storeResults.length}</span>
                    </div>
                    <div className="divide-y divide-border/20">
                      {storeResults.map((store, idx) => (
                        <button
                          key={store.id}
                          onClick={() => handleSelect(`/store/${store.slug}`)}
                          className={cn(
                            "w-full flex items-center gap-3.5 py-3 text-left",
                            "hover:bg-muted/40 active:bg-muted/60 transition-colors active:scale-[0.99] touch-manipulation",
                            "rounded-lg -mx-1 px-1",
                            "animate-in fade-in slide-in-from-bottom-1 duration-200"
                          )}
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          {store.logo_url ? (
                            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover bg-muted shrink-0" loading="lazy" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
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
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* View all CTA */}
              {!displayLoading && (displayProducts.length > 0 || storeResults.length > 0) && (
                <>
                  <div className="h-px bg-border/30" />
                  <div className="px-4 py-3">
                    <button
                      onClick={handleViewAllResults}
                      className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-primary/5 hover:bg-primary/10 text-sm font-medium text-primary transition-all active:scale-[0.99] touch-manipulation"
                    >
                      <span>View all results</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
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
      "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50",
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
          className="h-11 w-11 rounded-xl object-cover bg-muted shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Package className="h-4.5 w-4.5 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {highlightMatch ? highlightMatch(product.name) : product.name}
        </span>
      </div>
      <span className="text-xs font-semibold text-foreground/70 tabular-nums shrink-0">
        {formatPrice(product.price)}
      </span>
    </>
  );
}
