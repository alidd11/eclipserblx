import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Home, ArrowLeft, ArrowRight } from 'lucide-react';
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
};

// Routes that should NOT show breadcrumbs
const excludedRoutes = ['/', '/auth'];

function formatSegmentLabel(segment: string): string {
  if (routeLabels[segment]) return routeLabels[segment];
  // Convert slugs to readable labels (e.g. "my-cool-store" -> "My Cool Store")
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function UniversalBreadcrumb() {
  const location = useLocation();
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on excluded routes or root
  if (excludedRoutes.includes(location.pathname) || pathSegments.length === 0) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = formatSegmentLabel(segment);
    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast };
  });

  const handleBack = () => {
    hapticTap();
    goBack();
  };

  const handleForward = () => {
    hapticTap();
    goForward();
  };

  return (
    <div className="border-b border-border/50 bg-muted/30">
      <div className="container mx-auto py-2 flex items-center gap-2">
        {/* Navigation History Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleBack}
                disabled={!canGoBack}
                className={cn(
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  canGoBack
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95"
                    : "text-muted-foreground/30 cursor-not-allowed"
                )}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
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
                  "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  canGoForward
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95"
                    : "text-muted-foreground/30 cursor-not-allowed"
                )}
                aria-label="Go forward"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Forward
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 shrink-0" />

        {/* Breadcrumb Trail */}
        <Breadcrumb className="min-w-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Eclipse</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {breadcrumbItems.map((item) => (
              <span key={item.path} className="contents">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage className="truncate max-w-[200px]">{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.path} className="text-muted-foreground hover:text-foreground truncate max-w-[150px]">
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
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
