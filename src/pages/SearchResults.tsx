import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Sparkles, Loader2, Package } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/ProductCardSkeleton';
import { SearchCategoryFilters } from '@/components/search/SearchCategoryFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useDebounce } from '@/hooks/useDebounce';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from 'react-i18next';

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
}

export default function SearchResults() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || null;
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [categorySlug, setCategorySlug] = useState<string | null>(initialCategory);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const { addSearch } = useRecentSearches();
  const { search: smartSearch, isSearching, results: smartResults } = useSmartSearch();
  const [useAI, setUseAI] = useState(false);

  usePageMeta({
    title: initialQuery ? `Search: ${initialQuery}` : 'Search Products',
    description: 'Search for premium Roblox assets, scripts, bots and more on Eclipse marketplace.',
    canonicalPath: '/search',
  });

  // Sync URL with query & category
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;
    if (debouncedQuery !== (params.get('q') || '')) {
      if (debouncedQuery) params.set('q', debouncedQuery); else params.delete('q');
      changed = true;
    }
    if (categorySlug !== (params.get('category') || null)) {
      if (categorySlug) params.set('category', categorySlug); else params.delete('category');
      changed = true;
    }
    if (changed) setSearchParams(params, { replace: true });
  }, [debouncedQuery, categorySlug]);

  const buildQuery = useCallback((offset: number) => {
    let q = supabase
      .from('products')
      .select('id, name, slug, price, images, description, is_featured, categories (name, slug), stores!inner (name, is_active)', { count: 'exact' })
      .eq('is_active', true)
      .eq('stores.is_active', true);

    if (debouncedQuery.length >= 2) {
      q = q.or(`name.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`);
    }

    if (categorySlug) {
      q = q.eq('categories.slug', categorySlug);
    }

    switch (sortBy) {
      case 'newest': q = q.order('created_at', { ascending: false }); break;
      case 'price-low': q = q.order('price', { ascending: true }); break;
      case 'price-high': q = q.order('price', { ascending: false }); break;
      case 'popularity': q = q.order('total_sales', { ascending: false }); break;
      default: q = q.order('is_featured', { ascending: false }).order('total_sales', { ascending: false });
    }

    return q.range(offset, offset + PAGE_SIZE - 1);
  }, [debouncedQuery, sortBy, categorySlug]);

  // Initial fetch
  useEffect(() => {
    if (useAI) return;
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
        const { data, error, count } = await buildQuery(0);
        if (!error && data) {
          const results = data as unknown as ProductResult[];
          setProducts(results);
          setTotalCount(count || results.length);
          setHasMore(results.length === PAGE_SIZE && (count || 0) > PAGE_SIZE);
        }
      } catch {
        console.error('Search error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();
  }, [debouncedQuery, sortBy, categorySlug, useAI]);

  // Load more
  const loadMore = useCallback(async () => {
    if (isLoadingMore || useAI) return;
    const nextOffset = (pageRef.current + 1) * PAGE_SIZE;
    setIsLoadingMore(true);
    try {
      const { data, error, count } = await buildQuery(nextOffset);
      if (!error && data) {
        const results = data as unknown as ProductResult[];
        pageRef.current += 1;
        setProducts(prev => [...prev, ...results]);
        setHasMore(results.length === PAGE_SIZE && nextOffset + results.length < (count || 0));
      }
    } catch {
      console.error('Load more error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [buildQuery, isLoadingMore, useAI]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore,
  });

  const handleAISearch = useCallback(() => {
    if (query.length < 3) return;
    setUseAI(true);
    smartSearch(query);
    addSearch(query);
  }, [query, smartSearch, addSearch]);

  const handleCategorySelect = useCallback((slug: string | null) => {
    setCategorySlug(slug);
    setUseAI(false);
  }, []);

  const displayProducts = useAI && smartResults.length > 0
    ? smartResults.map(r => ({ ...r, is_featured: false, categories: r.categories ? { ...r.categories, slug: '' } : null, stores: null, average_rating: undefined, review_count: undefined }))
    : products;
  const displayLoading = useAI ? isSearching : isLoading;
  const showResults = debouncedQuery.length >= 2 || categorySlug;

  return (
    <MainLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Search Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setUseAI(false); }}
                placeholder="Search products..."
                className="pl-10 pr-10 h-11"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setUseAI(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              variant={useAI ? "default" : "outline"}
              size="sm"
              onClick={handleAISearch}
              disabled={query.length < 3 || isSearching}
              className="gap-1.5 shrink-0"
            >
              {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Search
            </Button>
          </div>

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
                  {useAI && <span className="text-primary ml-1">(AI enhanced)</span>}
                </>
              ) : (
                'Enter a search query or select a category'
              )}
            </p>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setUseAI(false); }}>
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
                  slug={String((product as any).product_number)}
                  price={product.price}
                  images={product.images}
                  category={product.categories?.name}
                  isFeatured={(product as any).is_featured}
                  storeName={(product as any).stores?.name}
                />
              ))}
            </div>
            {/* Infinite scroll sentinel */}
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
                We couldn't find anything matching your criteria. Try different keywords or{' '}
                <button onClick={handleAISearch} className="text-primary hover:underline">use AI search</button>.
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
