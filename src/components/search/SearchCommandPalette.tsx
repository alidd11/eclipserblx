import { useState, useEffect, useCallback, forwardRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Search, Sparkles, Loader2,
  Clock, X, TrendingUp, ArrowRight, Keyboard, Store
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { hapticTap } from '@/lib/haptics';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { useCurrency } from '@/hooks/useCurrency';
import { useRecentSearches } from '@/hooks/useRecentSearches';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
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
  const [products, setProducts] = useState<Product[]>([]);
  const [storeResults, setStoreResults] = useState<StoreResult[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useAI, setUseAI] = useState(false);
  const { searches: recentSearches, addSearch, removeSearch } = useRecentSearches();
  
  const { search: smartSearch, isSearching: isSmartSearching, results: smartResults } = useSmartSearch();

  // Fetch trending products on open
  useEffect(() => {
    if (!open) return;
    if (trendingProducts.length > 0) return;

    const fetchTrending = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, price, images, stores (is_active)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(6);

      if (data) {
        const filtered = data.filter((p: any) => p.stores?.is_active === true);
        setTrendingProducts(filtered.slice(0, 4));
      }
    };
    fetchTrending();
  }, [open, trendingProducts.length]);

  // Fetch products when search query changes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setUseAI(false);
      setStoreResults([]);
      return;
    }

    if (useAI) return;

    const fetchProducts = async () => {
      if (searchQuery.length < 2) {
        setProducts([]);
        setStoreResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Search products by name OR description, plus search stores
        const [productRes, storeRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, slug, price, images, stores!inner (is_active)')
            .eq('is_active', true)
            .eq('stores.is_active', true)
            .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
            .order('total_sales', { ascending: false })
            .limit(8),
          supabase
            .from('stores')
            .select('id, name, slug, logo_url, is_verified')
            .eq('status', 'approved')
            .eq('is_active', true)
            .ilike('name', `%${searchQuery}%`)
            .limit(4),
        ]);

        if (!productRes.error && productRes.data) {
          setProducts(productRes.data.slice(0, 5));
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
  }, [searchQuery, open, useAI]);

  const displayProducts = useAI && smartResults.length > 0 ? smartResults : products;
  const displayLoading = useAI ? isSmartSearching : isLoading;
  const hasQuery = searchQuery.length >= 2;

  // Highlight matching text in product names
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
    if (searchQuery.trim()) {
      addSearch(searchQuery.trim());
    }
    hapticTap();
    onOpenChange(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  }, [searchQuery, navigate, onOpenChange, addSearch]);

  const handleRecentSearchClick = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const resultCount = useMemo(() => displayProducts.length, [displayProducts]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Search Input Area */}
      <div className="relative">
        <CommandInput 
          placeholder="Search products..." 
          value={searchQuery}
          onValueChange={(val) => {
            setSearchQuery(val);
            setUseAI(false);
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {useAI && isSmartSearching && (
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="font-medium">AI</span>
            </div>
          )}
          {searchQuery.length >= 3 && !useAI && (
            <button
              type="button"
              onClick={() => {
                setUseAI(true);
                smartSearch(searchQuery);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/5 border border-transparent hover:border-primary/20"
            >
              <Sparkles className="h-3 w-3" />
              <span>AI</span>
            </button>
          )}
        </div>
      </div>

      <CommandList className="max-h-[min(60vh,420px)] scrollbar-thin">
        <CommandEmpty>
          {displayLoading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-muted" />
                <Loader2 className="h-10 w-10 animate-spin text-primary absolute inset-0" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {useAI ? 'AI is searching...' : 'Searching...'}
              </span>
            </div>
          ) : hasQuery ? (
            <div className="py-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                <Search className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse all products</p>
              </div>
              <button
                onClick={handleViewAllResults}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Search all products <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-xs text-muted-foreground">Type to search products...</p>
            </div>
          )}
        </CommandEmpty>

        {/* Recent Searches */}
        {!hasQuery && recentSearches.length > 0 && (
          <CommandGroup heading="RECENT">
            {recentSearches.slice(0, 4).map((query) => (
              <CommandItem
                key={query}
                value={`recent-${query}`}
                onSelect={() => handleRecentSearchClick(query)}
                className="cursor-pointer group"
              >
                <Clock className="mr-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="flex-1 text-sm text-muted-foreground group-data-[selected=true]:text-foreground transition-colors">{query}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(query);
                  }}
                  className="opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Trending */}
        {!hasQuery && trendingProducts.length > 0 && (
          <>
            {recentSearches.length > 0 && <CommandSeparator />}
            <CommandGroup heading="TRENDING">
              {trendingProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`trending-${product.name}`}
                  onSelect={() => handleSelect(`/products/${product.slug}`)}
                  className="cursor-pointer group"
                >
                  <TrendingUp className="mr-2.5 h-3.5 w-3.5 text-primary/50 group-data-[selected=true]:text-primary transition-colors" />
                  <ProductThumb product={product} formatPrice={formatPrice} />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Search Results */}
        {displayProducts.length > 0 && (
          <>
            <CommandGroup heading={
              <span className="flex items-center gap-2">
                {useAI ? 'AI RESULTS' : 'PRODUCTS'}
                <span className="text-[10px] font-normal text-muted-foreground/60 tabular-nums">
                  {resultCount}
                </span>
              </span>
            }>
              {displayProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    addSearch(searchQuery);
                    handleSelect(`/products/${product.slug}`);
                  }}
                  className="cursor-pointer group"
                >
                  {useAI && <Sparkles className="mr-2.5 h-3.5 w-3.5 text-primary/60 group-data-[selected=true]:text-primary shrink-0 transition-colors" />}
                  <ProductThumb product={product} formatPrice={formatPrice} highlightMatch={hasQuery ? (text: string) => highlightMatch(text, searchQuery) : undefined} />
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Store Results */}
            {storeResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="STORES">
                  {storeResults.map((store) => (
                    <CommandItem
                      key={store.id}
                      value={`store-${store.name}`}
                      onSelect={() => handleSelect(`/store/${store.slug}`)}
                      className="cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover bg-muted shrink-0 ring-1 ring-border/50" loading="lazy" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 ring-1 ring-border/50">
                            <Store className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                        <span className="text-sm truncate group-data-[selected=true]:text-foreground transition-colors">
                          {highlightMatch(store.name, searchQuery)}
                        </span>
                        {store.is_verified && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">Verified</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="view-all-search-results"
                onSelect={handleViewAllResults}
                className="cursor-pointer group"
              >
                <Search className="mr-2.5 h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="flex-1 text-sm text-muted-foreground group-data-[selected=true]:text-foreground transition-colors">
                  View all results for "<span className="font-medium">{searchQuery}</span>"
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-data-[selected=true]:text-foreground transition-colors" />
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer */}
      <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/50">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/50">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/50">esc</kbd>
            close
          </span>
        </div>
        {hasQuery && (
          <button
            onClick={handleViewAllResults}
            className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Full results <ArrowRight className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </CommandDialog>
  );
});

/* ── Product thumbnail sub-component ── */
function ProductThumb({ product, formatPrice, highlightMatch }: { 
  product: Product; 
  formatPrice: (price: number) => string;
  highlightMatch?: (text: string) => React.ReactNode;
}) {
  const img = product.images?.[0];
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {img ? (
        <img
          src={img}
          alt=""
          className="h-9 w-9 rounded-lg object-cover bg-muted shrink-0 ring-1 ring-border/50"
          loading="lazy"
        />
      ) : (
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 ring-1 ring-border/50">
          <Package className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block group-data-[selected=true]:text-foreground transition-colors">
          {highlightMatch ? highlightMatch(product.name) : product.name}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
        {formatPrice(product.price)}
      </span>
    </div>
  );
}
