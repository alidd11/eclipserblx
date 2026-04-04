import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingCart, Package, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { hapticTap } from '@/lib/haptics';
import { useAuth } from '@/hooks/useAuth';

interface TabItem {
  icon: typeof Home;
  label: string;
  href: string;
  isCenter?: boolean;
  showBadge?: boolean;
}

const TAB_ITEMS: TabItem[] = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Compass, label: 'Browse', href: '/products' },
  { icon: ShoppingCart, label: 'Cart', href: '/cart', isCenter: true, showBadge: true },
  { icon: Package, label: 'Orders', href: '/orders' },
  { icon: Grid3X3, label: 'Hub', href: '/account' },
];

/** Hidden routes where the tab bar should not appear */
const HIDDEN_PREFIXES = ['/admin', '/seller', '/auth', '/checkout', '/guard'];

export function MobileTabBar() {
  const location = useLocation();
  const { items } = useCart();
  const { user } = useAuth();
  const cartCount = items.length;

  if (HIDDEN_PREFIXES.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {TAB_ITEMS.map(({ icon: Icon, label, href, isCenter, showBadge }) => {
          const isActive = href === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(href);

          const actualHref = (href === '/account' || href.startsWith('/account?')) && !user ? '/auth' : href;

          if (isCenter) {
            return (
              <NavLink
                key={href}
                to={actualHref}
                onClick={hapticTap}
                className="flex flex-col items-center justify-center flex-1 h-full relative select-none active:scale-95 transition-transform duration-150"
                role="tab"
                aria-selected={isActive}
              >
                <div className={cn(
                  "relative -mt-4 flex items-center justify-center h-12 w-12 rounded-xl",
                  "bg-muted/80 shadow-md",
                  isActive && "bg-primary/15"
                )}>
                  <Icon className={cn("h-6 w-6", isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground")} />
                  {showBadge && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[11px] leading-tight mt-0.5", isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium")}>
                  {label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-primary" />
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={href}
              to={actualHref}
              end={href === '/'}
              onClick={hapticTap}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative",
                "transition-colors duration-150 select-none active:scale-95"
              )}
              role="tab"
              aria-selected={isActive}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full transition-colors duration-150",
                isActive && "bg-primary/15"
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground")} />
              </div>
              <span className={cn("text-[11px] leading-tight", isActive ? "text-primary font-semibold" : "text-muted-foreground font-medium")}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-4 h-0.5 rounded-full bg-primary" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
