import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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
};

// Routes that should NOT show breadcrumbs
const excludedRoutes = ['/', '/auth'];

export function UniversalBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on excluded routes or root
  if (excludedRoutes.includes(location.pathname) || pathSegments.length === 0) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast };
  });

  return (
    <div className="border-b border-border/50 bg-muted/30">
      <div className="container mx-auto px-4 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Eclipse</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {breadcrumbItems.map((item, index) => (
              <span key={item.path} className="contents">
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.path} className="text-muted-foreground hover:text-foreground">
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
