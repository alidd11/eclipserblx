import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Grid3X3, Star, Circle, MessageSquare, Briefcase, 
  HelpCircle, Mail, FileQuestion, Activity, FileText, Shield, 
  RotateCcw, ShoppingCart, User, Home, Search, Sparkles, Loader2
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

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
}

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  { title: 'Home', icon: Home, href: '/', keywords: ['home', 'main', 'start'] },
  { title: 'All Products', icon: Package, href: '/products', keywords: ['products', 'shop', 'store', 'items'] },
  { title: 'Categories', icon: Grid3X3, href: '/categories', keywords: ['categories', 'browse', 'types'] },
  { title: 'Featured Products', icon: Star, href: '/products?featured=true', keywords: ['featured', 'popular', 'best'] },
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

export function SearchCommandPalette({ open, onOpenChange }: SearchCommandPaletteProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [useAI, setUseAI] = useState(false);
  
  const { search: smartSearch, isSearching: isSmartSearching, results: smartResults } = useSmartSearch();

  // Detect if query looks like natural language
  useEffect(() => {
    const nlPatterns = /\b(under|below|above|over|between|cheap|expensive|free|best|top|new|latest|popular|for|with|like|similar)\b/i;
    setUseAI(nlPatterns.test(searchQuery) && searchQuery.length > 5);
  }, [searchQuery]);

  // Fetch products when search query changes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      return;
    }

    // If using AI search, let the smart search handle it
    if (useAI) {
      if (searchQuery.length >= 3) {
        const debounce = setTimeout(() => {
          smartSearch(searchQuery);
        }, 500);
        return () => clearTimeout(debounce);
      }
      return;
    }

    const fetchProducts = async () => {
      if (searchQuery.length < 2) {
        setProducts([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, price, stores (is_active)')
          .eq('is_active', true)
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          // Include products without stores (Eclipse main store) or with active stores
          const filtered = data.filter(p => !p.stores || p.stores.is_active !== false);
          setProducts(filtered.slice(0, 5));
        }
      } catch {
        console.error('Error fetching products');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, open, useAI, smartSearch]);

  // Use smart search results when AI is active
  const displayProducts = useAI && smartResults.length > 0 ? smartResults : products;
  const displayLoading = useAI ? isSmartSearching : isLoading;

  const handleSelect = useCallback((href: string) => {
    hapticTap();
    onOpenChange(false);
    navigate(href);
  }, [navigate, onOpenChange]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <CommandInput 
          placeholder="Search products, pages, or try 'scripts under £10'..." 
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        {useAI && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Search</span>
          </div>
        )}
      </div>
      <CommandList>
        <CommandEmpty>
          {displayLoading ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{useAI ? 'AI is searching...' : 'Searching...'}</span>
            </div>
          ) : (
            'No results found.'
          )}
        </CommandEmpty>

        {/* Products */}
        {displayProducts.length > 0 && (
          <CommandGroup heading={useAI ? "AI Results" : "Products"}>
            {displayProducts.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => handleSelect(`/products/${product.slug}`)}
                className="cursor-pointer"
              >
                {useAI ? (
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                <span className="flex-1">{product.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(product.price)}
                </span>
              </CommandItem>
            ))}
            <CommandItem
              value="view-all-products"
              onSelect={() => handleSelect('/products')}
              className="cursor-pointer"
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="text-muted-foreground">View all products...</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Quick Navigation */}
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

        {/* Support */}
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

        {/* Legal */}
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
      </CommandList>
    </CommandDialog>
  );
}
