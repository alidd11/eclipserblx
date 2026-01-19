import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Grid3X3, Star, Circle, MessageSquare, Briefcase, 
  HelpCircle, Mail, FileQuestion, Activity, FileText, Shield, 
  RotateCcw, ShoppingCart, User, Home, Search
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

  // Fetch products when search query changes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
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
          .select('id, name, slug, price')
          .eq('is_active', true)
          .ilike('name', `%${searchQuery}%`)
          .limit(5);

        if (!error && data) {
          setProducts(data);
        }
      } catch {
        console.error('Error fetching products');
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, open]);

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
      <CommandInput 
        placeholder="Search products, pages, and more..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {/* Products */}
        {products.length > 0 && (
          <CommandGroup heading="Products">
            {products.map((product) => (
              <CommandItem
                key={product.id}
                value={product.name}
                onSelect={() => handleSelect(`/products/${product.slug}`)}
                className="cursor-pointer"
              >
                <Package className="mr-2 h-4 w-4" />
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
