import { useState, useEffect, useCallback, useRef } from 'react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Search, SlidersHorizontal, X, Loader2, Package } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/ProductCardSkeleton';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';
import { useURLState } from '@/hooks/useURLState';

type SortOption = 'relevance' | 'newest' | 'price-low' | 'price-high' | 'popularity';
const PAGE_SIZE = 20;

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  description: string | null;
  is_featured: boolean;
  categories: { name: string; slug: string } | null;
  stores: { name: string; is_active: boolean } | null;
  average_rating?: number;
  review_count?: number;
  // From RPC
  category_name?: string;
  category_slug?: string;
  store_name?: string;
  store_slug?: string;
  store_verified?: boolean;
  rank_score?: number;
}

export default function SearchResults() {
  const { t } = useTranslation();
  const [urlQuery, setUrlQuery] = useURLState('q', '');
  const [categorySlug, setCategorySlug] = useURLState('category', '');
  const [sortBy, setSortBy] = useURLState('sort', 'relevance');
  const [minPriceUrl, setMinPriceUrl] = useURLState('min_price', '');
  const [maxPriceUrl, setMaxPriceUrl] = useURLState('max_price', '');
  const [freeOnlyUrl, setFreeOnlyUrl] = useURLState('free', '');

  const [query, setQuery] = useState(urlQuery);
  const [minPrice, setMinPrice] = useState(minPriceUrl);
  const [maxPrice, setMaxPrice] = useState(maxPriceUrl);
  const [freeOnly, setFreeOnly] = useState(freeOnlyUrl === 'true');

  const debouncedQuery = useDebounce(query, 300);
  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);

  const [products, setProducts] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const { addSearch } = useRecentSearches();
  const { correction } = useSearchSuggestions(debouncedQuery);

  // Sync to URL
  useEffect(() => { setUrlQuery(debouncedQuery); }, [debouncedQuery, setUrlQuery]);
  useEffect(() => { setMinPriceUrl(debouncedMinPrice); }, [debouncedMinPrice, setMinPriceUrl]);
  useEffect(() => { setMaxPriceUrl(debouncedMaxPrice); }, [debouncedMaxPrice, setMaxPriceUrl]);
  useEffect(() => { setFreeOnlyUrl(freeOnly ? 'true' : ''); }, [freeOnly, setFreeOnlyUrl]);

  const activeFilterCount = [minPrice, maxPrice, freeOnly ? 'yes' : ''].filter(Boolean).length;

  usePageMeta({
    title: urlQuery ? `Search: ${urlQuery}` : 'Search Products',
    description: 'Search for premium Roblox assets, scripts, bots and more on Eclipse marketplace.',
    canonicalPath: '/search',
  });

  const sortMapping: Record<string, string> = {
    'relevance': 'relevance',
    'newest': 'newest',
    'price-low': 'price_asc',
    'price-high': 'price_desc',
    'popularity': 'popular',
  };

  // Initial fetch using search_products_v2 RPC
  useEffect(() => {
    if (debouncedQuery.length < 2 && !categorySlug) {
      setProducts([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    const fetchInitial = async () => {
      if (debouncedQuery.length >= 2) addSearch(debouncedQuery);
      setIsLoading(true);
      pageRef.current = 0;
      try {
        const { data, error } = await supabase.rpc('search_products_v2', {
          search_query: debouncedQuery || '',
          category_filter: categorySlug ?? undefined,
          min_price: debouncedMinPrice ? parseFloat(debouncedMinPrice) : undefined,
          max_price: debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : undefined,
          free_only: freeOnly,
          sort_by: sortMapping[sortBy] || 'relevance',
          page_size: PAGE_SIZE,
          page_offset: 0,
        } as any);

        if (!error && data) {
          const results = (data as any[]).map(r => ({
            ...r,
            is_featured: false,
            categories: r.category_name ? { name: r.category_name, slug: r.category_slug || '' } : null,
            stores: r.store_name ? { name: r.store_name, is_active: true } : null,
          }));
          setProducts(results);
          setTotalCount(results.length);
          setHasMore(results.length === PAGE_SIZE);
        }
      } catch {
        console.error('Search error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();
  }, [debouncedQuery, sortBy, categorySlug, debouncedMinPrice, debouncedMaxPrice, freeOnly]);

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    const nextOffset = (pageRef.current + 1) * PAGE_SIZE;
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase.rpc('search_products_v2', {
        search_query: debouncedQuery || '',
        category_filter: categorySlug ?? undefined,
        min_price: debouncedMinPrice ? parseFloat(debouncedMinPrice) : undefined,
        max_price: debouncedMaxPrice ? parseFloat(debouncedMaxPrice) : undefined,
        free_only: freeOnly,
        sort_by: sortMapping[sortBy] || 'relevance',
        page_size: PAGE_SIZE,
        page_offset: nextOffset,
      } as any);

      if (!error && data) {
        const results = (data as any[]).map(r => ({
          ...r,
          is_featured: false,
          categories: r.category_name ? { name: r.category_name, slug: r.category_slug || '' } : null,
          stores: r.store_name ? { name: r.store_name, is_active: true } : null,
        }));
        pageRef.current += 1;
        setProducts(prev => [...prev, ...results]);
        setHasMore(results.length === PAGE_SIZE);
      }
    } catch {
      console.error('Load more error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [debouncedQuery, sortBy, categorySlug, isLoadingMore, debouncedMinPrice, debouncedMaxPrice, freeOnly]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore,
  });

  const handleCategorySelect = useCallback((slug: string | null) => {
    setCategorySlug(slug || '');
  }, [setCategorySlug]);

  const handleCorrectionClick = useCallback((corrected: string) => {
    setQuery(corrected);
  }, []);

  const handleResetFilters = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    setFreeOnly(false);
  }, []);

  const displayProducts = products;
  const displayLoading = isLoading;
  const showResults = debouncedQuery.length >= 2 || categorySlug;

  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Search Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); }}
                placeholder="Search products..."
                className="pl-10 pr-10 h-11"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <SearchFilters
              minPrice={minPrice}
              maxPrice={maxPrice}
              freeOnly={freeOnly}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              onFreeOnlyChange={setFreeOnly}
              onReset={handleResetFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>

          {/* "Did you mean?" */}
          {correction && showResults && displayProducts.length === 0 && !displayLoading && (
            <div className="text-sm text-muted-foreground">
              Did you mean{' '}
              <button
                onClick={() => handleCorrectionClick(correction)}
                className="text-primary font-medium hover:underline"
              >
                "{correction}"
              </button>
              ?
            </div>
          )}

          {/* Category Filters */}
          <SearchCategoryFilters selected={categorySlug} onSelect={handleCategorySelect} />

          {/* Results count + sort */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {displayLoading ? (
                'Searching...'
              ) : showResults ? (
                <>
                  <span className="font-medium text-foreground">{totalCount}</span>
                  {' '}result{totalCount !== 1 ? 's' : ''}
                  {debouncedQuery.length >= 2 && <> for "{debouncedQuery}"</>}
                  {categorySlug && <span className="text-primary ml-1">in {categorySlug}</span>}
                </>
              ) : (
                'Enter a search query or select a category'
              )}
            </p>
            <Select value={sortBy || 'relevance'} onValueChange={(v) => { setSortBy(v); }}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low → High</SelectItem>
                <SelectItem value="price-high">Price: High → Low</SelectItem>
                <SelectItem value="popularity">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Grid */}
        {displayLoading ? (
          <ProductGridSkeleton count={8} />
        ) : displayProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={String((product as any).product_number || product.slug)}
                  price={product.price}
                  images={product.images}
                  category={(product as any).categories?.name || (product as any).category_name}
                  isFeatured={(product as any).is_featured}
                  storeName={(product as any).stores?.name || (product as any).store_name}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="h-1" />
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && products.length > PAGE_SIZE && (
              <p className="text-center text-xs text-muted-foreground py-4">All results loaded</p>
            )}
          </>
        ) : showResults ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold">No products found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                We couldn't find anything matching your criteria. Try different keywords.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/products">Browse all products</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold">Search for products</h3>
              <p className="text-sm text-muted-foreground">
                Type at least 2 characters or select a category to start browsing
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
