import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';

// Map routes to their display names for contextual back navigation
const ROUTE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/products': 'Products',
  '/categories': 'Categories',
  '/featured': 'Featured',
  '/cart': 'Cart',
  '/wishlist': 'Wishlist',
  '/account': 'Account',
  '/forum': 'Forum',
  '/eclipse-plus': 'Eclipse+',
  '/jobs': 'Jobs',
};

interface BackButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function BackButton({ className, showLabel = true }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page
  if (location.pathname === '/') return null;

  // Get contextual back label based on referrer or default
  const getBackLabel = (): string => {
    // Check if we came from a known route
    const referrer = document.referrer;
    if (referrer) {
      try {
        const url = new URL(referrer);
        const path = url.pathname;
        // Check for exact match
        if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
        // Check for partial match (e.g., /products/something -> Products)
        const basePath = '/' + path.split('/')[1];
        if (ROUTE_NAMES[basePath]) return ROUTE_NAMES[basePath];
      } catch {
        // Invalid referrer URL, ignore
      }
    }

    // Fallback based on current path depth
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length > 1) {
      const parentPath = '/' + segments[0];
      if (ROUTE_NAMES[parentPath]) return ROUTE_NAMES[parentPath];
    }

    return 'Back';
  };

  const handleBack = () => {
    hapticTap();
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <button
      onClick={handleBack}
      className={cn(
        'group flex items-center gap-0.5 text-primary transition-all duration-150',
        'active:scale-95 active:opacity-70',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-md',
        'touch-manipulation select-none',
        '-ml-1 py-1 pr-2',
        className
      )}
      aria-label="Go back"
    >
      <ChevronLeft 
        className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-150 group-active:-translate-x-0.5" 
        strokeWidth={2.5}
      />
      {showLabel && (
        <span className="text-sm sm:text-base font-medium">
          {getBackLabel()}
        </span>
      )}
    </button>
  );
}
