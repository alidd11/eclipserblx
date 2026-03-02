import { useState, useEffect, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Grid3X3, Star, Circle, MessageSquare, Briefcase, 
  HelpCircle, Mail, FileQuestion, Activity, FileText, Shield, 
  RotateCcw, ShoppingCart, User, Home, Search, Sparkles, Loader2,
  Clock, X, TrendingUp, ArrowRight
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

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  { title: 'Home', icon: Home, href: '/', keywords: ['home', 'main', 'start'] },
  { title: 'All Products', icon: Package, href: '/products', keywords: ['products', 'shop', 'store', 'items'] },
  { title: 'Categories', icon: Grid3X3, href: '/categories', keywords: ['categories', 'browse', 'types'] },
  { title: 'Featured', icon: Star, href: '/featured', keywords: ['featured', 'popular', 'best'] },
  { title: 'Eclipse+', icon: Circle, href: '/eclipse-plus', keywords: ['eclipse plus', 'subscription', 'premium', 'membership'] },
  { title: 'Forum', icon: MessageSquare, href: '/forum', keywords: ['forum', 'community', 'discuss', 'chat'] },
  { title: 'Jobs', icon: Briefcase, href: '/jobs', keywords: ['jobs', 'careers', 'work', 'hiring'] },
  { title: 'Cart', icon: ShoppingCart, href: '/cart', keywords: ['cart', 'basket', 'checkout'] },
  { title: 'Account', icon: User, href: '/account', keywords: ['account', 'profile', 'settings', 'my'] },
];

const supportItems = [
  { title: 'Help Center', icon: HelpCircle, href: '/support', keywords: ['help', 'support', 'assistance'] },
  { title: 'Contact Us', icon: Mail, href: '/contact', keywords: ['contact', 'email', 'message', 'reach'] },
  { title: 'FAQ', icon: FileQuestion, href: '/faq', keywords: ['faq', 'questions', 'answers'] },
  { title: 'System Status', icon: Activity, href: '/status', keywords: ['status', 'uptime', 'system'] },
];

const legalItems = [
  { title: 'Terms of Service', icon: FileText, href: '/terms', keywords: ['terms', 'tos', 'legal'] },
  { title: 'Privacy Policy', icon: Shield, href: '/privacy', keywords: ['privacy', 'data', 'policy'] },
  { title: 'Refund Policy', icon: RotateCcw, href: '/refunds', keywords: ['refund', 'return', 'money back'] },
];

export const SearchCommandPalette = forwardRef<HTMLDivElement, SearchCommandPaletteProps>(function SearchCommandPalette({ open, onOpenChange }, _ref) {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
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
      return;
    }

    if (useAI) return;

    const fetchProducts = async () => {
      if (searchQuery.length < 2) {
        setProducts([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, price, images, stores (is_active)')
          .eq('is_active', true)
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          const filtered = data.filter((p: any) => p.stores?.is_active === true);
          setProducts(filtered.slice(0, 5));
        }
      } catch {
        console.error('Error fetching products');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 150); // faster debounce
    return () => clearTimeout(debounce);
  }, [searchQuery, open, useAI]);

  const displayProducts = useAI && smartResults.length > 0 ? smartResults : products;
  const displayLoading = useAI ? isSmartSearching : isLoading;
  const hasQuery = searchQuery.length >= 2;

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

  // Product thumbnail component
  const ProductThumb = ({ product }: { product: Product }) => {
    const img = product.images?.[0];
    return (
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {img ? (
          <img
            src={img}
            alt=""
            className="h-8 w-8 rounded-md object-cover bg-muted shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span className="truncate flex-1">{product.name}</span>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {formatPrice(product.price)}
        </span>
      </div>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <CommandInput 
          placeholder="Search products, pages, help..." 
          value={searchQuery}
          onValueChange={(val) => {
            setSearchQuery(val);
            setUseAI(false);
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {useAI && isSmartSearching && (
            <div className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>AI searching...</span>
            </div>
          )}
          {searchQuery.length >= 3 && !useAI && (
            <button
              type="button"
              onClick={() => {
                setUseAI(true);
                smartSearch(searchQuery);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-accent"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI</span>
            </button>
          )}
        </div>
      </div>
      <CommandList className="max-h-[min(60vh,400px)]">
        <CommandEmpty>
          {displayLoading ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{useAI ? 'AI is searching...' : 'Searching...'}</span>
            </div>
          ) : hasQuery ? (
            <div className="py-8 text-center space-y-3">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No results for "{searchQuery}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse categories</p>
              </div>
              <button
                onClick={handleViewAllResults}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
              >
                Search all products <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            'Type to search...'
          )}
        </CommandEmpty>

        {/* Recent Searches — shown when no query */}
        {!hasQuery && recentSearches.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.slice(0, 4).map((query) => (
              <CommandItem
                key={query}
                value={`recent-${query}`}
                onSelect={() => handleRecentSearchClick(query)}
                className="cursor-pointer group"
              >
                <Clock className="mr-2 h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="flex-1 text-muted-foreground">{query}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(query);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Trending — shown when no query */}
        {!hasQuery && trendingProducts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trending">
              {trendingProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`trending-${product.name}`}
                  onSelect={() => handleSelect(`/products/${product.slug}`)}
                  className="cursor-pointer"
                >
                  <TrendingUp className="mr-2 h-3.5 w-3.5 text-primary/60" />
                  <ProductThumb product={product} />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Search Results */}
        {displayProducts.length > 0 && (
          <CommandGroup heading={useAI ? "AI Results" : "Products"}>
            {displayProducts.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => {
                  addSearch(searchQuery);
                  handleSelect(`/products/${product.slug}`);
                }}
                className="cursor-pointer"
              >
                {useAI && <Sparkles className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />}
                <ProductThumb product={product} />
              </CommandItem>
            ))}
            {/* View all results link */}
            <CommandItem
              value="view-all-search-results"
              onSelect={handleViewAllResults}
              className="cursor-pointer"
            >
              <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-muted-foreground">
                View all results for "{searchQuery}"
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </CommandItem>
          </CommandGroup>
        )}

        {/* Quick Navigation — collapsed when searching */}
        {!hasQuery && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Support">
              {supportItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Legal">
              {legalItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.title} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer hint */}
      {hasQuery && (
        <div className="border-t border-border px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">↵</kbd> to select
          </span>
          <button
            onClick={handleViewAllResults}
            className="text-[10px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Full search page <ArrowRight className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </CommandDialog>
  );
});
