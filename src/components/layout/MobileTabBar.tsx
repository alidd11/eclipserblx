import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { hapticTap } from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';

const TAB_ITEMS: { icon: typeof Home; label: string; href: string; showBadge?: boolean }[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Grid3X3, label: 'Shop', href: '/products' },
  { icon: ShoppingCart, label: 'Cart', href: '/cart', showBadge: true },
  { icon: User, label: 'Account', href: '/account' },
];

/** Hidden routes where the tab bar should not appear */
const HIDDEN_PREFIXES = ['/admin', '/seller', '/auth', '/checkout', '/guard'];

export function MobileTabBar() {
  const location = useLocation();
  const { items } = useCart();
  const { user } = useAuth();
  const cartCount = items.length;

  // Hide on certain routes
  if (HIDDEN_PREFIXES.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden border-t border-border bg-card/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-14">
        {TAB_ITEMS.map(({ icon: Icon, label, href, showBadge }) => {
          const isActive = href === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(href);

          // Redirect to auth if not logged in and tapping Account
          const actualHref = href === '/account' && !user ? '/auth' : href;

          return (
            <NavLink
              key={href}
              to={actualHref}
              end={href === '/'}
              onClick={hapticTap}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative",
                "transition-colors duration-150 select-none",
                "active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              role="tab"
              aria-selected={isActive}
            >
              <div className="relative">
                <Icon
                  className={cn("h-5 w-5", isActive && "stroke-[2.5]")}
                />
                {showBadge && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
                {label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
