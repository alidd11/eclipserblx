import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { cn } from '@/lib/utils';

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
  const { isCustomStoreDomain } = useStoreDomain();
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

  return (
    <div className="border-b border-border/40 bg-card/30">
      <div className="container mx-auto py-2 px-3 sm:px-4">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs font-medium">{isCustomStoreDomain ? 'Store' : 'Home'}</span>
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
