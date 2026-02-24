import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Route configuration for breadcrumb labels
const routeLabels: Record<string, string> = {
  marketplace: 'Marketplace',
  products: 'Products',
  categories: 'Categories',
  featured: 'Featured',
  'eclipse-plus': 'Eclipse+',
  cart: 'Cart',
  account: 'Account',
  purchases: 'Purchases',
  wishlist: 'Wishlist',
  messages: 'Notifications',
  forum: 'Forum',
  jobs: 'Jobs',
  support: 'Help Center',
  contact: 'Contact',
  faq: 'FAQ',
  status: 'System Status',
  auth: 'Sign In',
  seller: 'Seller Dashboard',
  affiliate: 'Affiliate',
  advertise: 'Advertise',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  refunds: 'Refund Policy',
  'become-seller': 'Become a Seller',
  stores: 'Stores',
  store: 'Store',
  admin: 'Admin',
  following: 'Following',
  general: 'General Chat',
  // Seller dashboard sub-pages
  analytics: 'Analytics',
  balance: 'Balance',
  orders: 'Orders',
  reviews: 'Reviews',
  settings: 'Settings',
  discounts: 'Discounts',
  promotions: 'Promotions',
  bots: 'Bots',
  bundles: 'Bundles',
  discord: 'Discord',
  documents: 'Documents',
  guide: 'Guide',
  import: 'Import',
  notifications: 'Notifications',
  'flash-sales': 'Flash Sales',
  'custom-sections': 'Custom Sections',
  'revenue-breakdown': 'Revenue Breakdown',
  'transaction-history': 'Transaction History',
  'tax-fee-summary': 'Tax & Fee Summary',
  'terms-of-service': 'Terms of Service',
  announcements: 'Announcements',
  appearance: 'Appearance',
  payments: 'Payments',
  profile: 'Profile',
  roblox: 'Roblox',
  team: 'Team',
};

// Routes that should NOT show breadcrumbs
const excludedRoutes = ['/', '/auth'];

// Segments that are route prefixes only (not navigable on their own)
// These will show as text labels, not clickable links
const nonNavigableSegments = new Set(['store']);

function formatSegmentLabel(segment: string): string {
  if (routeLabels[segment]) return routeLabels[segment];
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function UniversalBreadcrumb() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (excludedRoutes.includes(location.pathname) || pathSegments.length === 0) {
    return null;
  }

  // Build breadcrumb items from path
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = formatSegmentLabel(segment);
    const isLast = index === pathSegments.length - 1;
    const isNavigable = !nonNavigableSegments.has(segment);
    return { path, label, isLast, isNavigable };
  });

  // Append query-param context (e.g. ?category=buildings → "Buildings")
  const category = searchParams.get('category');
  if (category) {
    // The last path item is no longer "last" visually
    if (breadcrumbItems.length > 0) {
      breadcrumbItems[breadcrumbItems.length - 1].isLast = false;
    }
    breadcrumbItems.push({
      path: location.pathname + '?category=' + category,
      label: formatSegmentLabel(category),
      isLast: true,
      isNavigable: true,
    });
  }

  const handleBack = () => {
    hapticTap();
    goBack();
  };

  const handleForward = () => {
    hapticTap();
    goForward();
  };

  return (
    <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto py-2 px-3 sm:px-4 flex items-center gap-2.5">
        {/* Navigation History Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleBack}
                disabled={!canGoBack}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-full transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  canGoBack
                    ? "text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90"
                    : "text-muted-foreground/25 cursor-not-allowed"
                )}
                aria-label="Go back"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Back
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleForward}
                disabled={!canGoForward}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-full transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  canGoForward
                    ? "text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90"
                    : "text-muted-foreground/25 cursor-not-allowed"
                )}
                aria-label="Go forward"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Forward
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border/50 shrink-0" />

        {/* Breadcrumb Trail */}
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">Home</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {breadcrumbItems.map((item) => (
              <span key={item.path} className="contents">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage className="truncate max-w-[180px] text-xs font-semibold text-foreground">
                      {item.label}
                    </BreadcrumbPage>
                  ) : item.isNavigable ? (
                    <BreadcrumbLink asChild>
                      <Link 
                        to={item.path} 
                        className="text-xs text-muted-foreground hover:text-primary truncate max-w-[140px] transition-colors"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {item.label}
                    </span>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
