import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_TITLE = 'Eclipse';

/**
 * Route-based title map for automatic page meta.
 * Pages that call usePageMeta() directly override this via document.title.
 * This ensures every page has at minimum a reasonable title for SEO & browser tabs.
 */
const ROUTE_TITLES: Record<string, string> = {
  '/': '',
  '/shop': 'Shop',
  '/cart': 'Cart',
  '/checkout': 'Checkout',
  '/orders': 'My Orders',
  '/purchases': 'My Purchases',
  '/wishlist': 'Wishlist',
  '/credits': 'Store Credits',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/contact': 'Contact Us',
  '/support': 'Support',
  '/affiliate': 'Affiliate Programme',
  '/search': 'Search',
  '/free-assets': 'Free Assets',
  '/help-center': 'Help Center',
  '/status': 'System Status',
  '/seller': 'Seller Dashboard',
  '/seller/orders': 'Seller Orders',
  '/seller/products': 'Products',
  '/seller/analytics': 'Analytics',
  '/seller/settings': 'Store Settings',
};

/**
 * Automatically sets a reasonable document.title based on the current route.
 * Call once at the layout level — individual pages can still override via usePageMeta().
 *
 * Skips admin routes (admin has its own title convention).
 */
export function useAutoPageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Skip admin — admin pages manage their own titles
    if (pathname.startsWith('/admin')) return;

    // Check exact match first, then prefix match for nested routes
    let title = ROUTE_TITLES[pathname];

    if (title === undefined) {
      // Try prefix matching (e.g. /seller/products/123 → "Products")
      const prefixMatch = Object.entries(ROUTE_TITLES)
        .filter(([route]) => route !== '/' && pathname.startsWith(route))
        .sort((a, b) => b[0].length - a[0].length)[0];

      if (prefixMatch) {
        title = prefixMatch[1];
      }
    }

    // Only set if we have a mapping — don't overwrite page-specific usePageMeta
    if (title !== undefined) {
      document.title = title ? `${title} | ${SITE_TITLE}` : `${SITE_TITLE} - Roblox Asset Marketplace`;
    }
  }, [pathname]);
}
