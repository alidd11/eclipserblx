import { memo, useState, forwardRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Circle, Package, Grid3X3, MessageSquare, Briefcase, FileText, Shield, RotateCcw, HelpCircle, Activity, LogOut, Sparkles, ChevronDown, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { supabase } from '@/integrations/supabase/client';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { HeaderSearchBar } from './HeaderSearchBar';
import { CurrencySelector } from './CurrencySelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useStoreDomain } from '@/hooks/useStoreDomain';

// Nav links use translation keys - labels resolved in render
const navLinkDefs = [
  { href: '/featured', labelKey: 'nav.featured', icon: Sparkles },
  { href: '/products', labelKey: 'nav.products', icon: Package },
  { href: '/categories', labelKey: 'nav.categories', icon: Grid3X3 },
  
  { href: '/jobs', labelKey: 'nav.careers', icon: Briefcase },
];
const legalLinkDefs = [
  { href: '/faq', labelKey: 'nav.faq', icon: HelpCircle },
  { href: '/privacy', labelKey: 'nav.privacyPolicy', icon: Shield },
  { href: '/terms', labelKey: 'nav.termsOfService', icon: FileText },
  { href: '/refunds', labelKey: 'nav.refundPolicy', icon: RotateCcw },
];




interface HeaderProps {
  showDesktopNav?: boolean;
  hideBrandName?: boolean;
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  /** Pin header to viewport on mobile (Safari/PWA safe) */
  mobileFixed?: boolean;
  className?: string;
}

export const Header = memo(forwardRef<HTMLElement, HeaderProps>(function Header({ showDesktopNav = true, hideBrandName = false, onMenuClick, onSidebarToggle, mobileFixed = false, className }: HeaderProps, ref) {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const { discordUrl } = useDiscordUrl();
  const { t } = useTranslation();
  const { isCustomStoreDomain, storeDomainData } = useStoreDomain();
  const storeLogoUrl = storeDomainData?.stores?.logo_url;
  const storeName = storeDomainData?.stores?.name;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const systemStatus = useSystemStatus();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  // Fetch parent categories for mobile Resources section
  const { data: parentCategories } = useQuery({
    queryKey: ['mobile-nav-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, icon')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      return data ?? [];
    },
    enabled: mobileMenuOpen,
  });

  const navLinks = navLinkDefs.map(l => ({ ...l, label: t(l.labelKey) }));
  const legalLinks = legalLinkDefs.map(l => ({ ...l, label: t(l.labelKey) }));

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    setMobileMenuOpen(false);
  };


  const statusConfig = {
    online: { label: t('status.online'), color: 'text-green-500', bg: 'bg-green-500' },
    degraded: { label: t('status.degraded'), color: 'text-yellow-500', bg: 'bg-yellow-500' },
    offline: { label: t('status.offline'), color: 'text-red-500', bg: 'bg-red-500' },
    checking: { label: t('status.checking'), color: 'text-muted-foreground', bg: 'bg-muted-foreground' },
  };

  return (
    <>
      {mobileFixed && <div aria-hidden="true" className="md:hidden h-[calc(env(safe-area-inset-top)+3.5rem)]" />}
      <header
        ref={ref}
        className={cn(
          "z-50 w-full bg-background/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]",
          mobileFixed
            ? "fixed top-0 left-0 right-0 md:relative"
            : "",
          className
        )}
      >
        <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]" aria-label="Main navigation">
        {/* Mobile header row */}
        <div className="flex md:hidden h-14 items-center gap-1.5">
          {/* Left section: Menu + Logo (fixed width) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => {
                if (onMenuClick) {
                  onMenuClick();
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              aria-label={!onMenuClick && mobileMenuOpen ? t('common.closeMenu', 'Close menu') : t('common.openMenu', 'Open menu')}
              aria-expanded={!onMenuClick ? mobileMenuOpen : undefined}
            >
              {!onMenuClick && mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/" className="flex items-center">
              {isCustomStoreDomain && storeLogoUrl ? (
                <img src={storeLogoUrl} alt={storeName || 'Store'} className="h-7 w-7 object-contain" />
              ) : (
                <EclipseLogo size="sm" />
              )}
            </Link>
          </div>

          {/* Middle section: Search bar (flex to fill) — hidden on custom domains */}
          {!isCustomStoreDomain && (
            <div className="flex-1 min-w-0">
              <HeaderSearchBar compact />
            </div>
          )}
          {isCustomStoreDomain && <div className="flex-1" />}

          {/* Right section: Icons (flush right, tighter spacing) */}
          <div className="flex items-center shrink-0 ml-auto gap-0.5">
            <NotificationBell />
            <Link to="/cart" aria-label={t('nav.shoppingCart')} className="hidden md:inline-flex">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground" aria-label={t('nav.shoppingCart')}>
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-medium text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
            {user ? (
              <Link to="/account" className="hidden md:inline-flex">
                <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground" aria-label={t('nav.myAccount')}>
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth" aria-label={t('common.signIn')} className="hidden md:inline-flex">
                <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground" aria-label={t('common.signIn')}>
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Desktop header row */}
        <div className="hidden md:flex h-16 items-center gap-4">
          {/* Left side - Hamburger + Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {onMenuClick && (
              <button
                className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={onMenuClick}
                aria-label={t('common.openMenu', 'Open menu')}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Link to="/" className="flex items-center shrink-0">
              {isCustomStoreDomain && storeLogoUrl ? (
                <img src={storeLogoUrl} alt={storeName || 'Store'} className="h-8 w-8 object-contain" />
              ) : (
                <EclipseLogo size="sm" />
              )}
            </Link>
          </div>

          {/* Center: Search + Currency + Language */}
          <div className="flex items-center gap-3 flex-1 justify-center min-w-0">
            {!isCustomStoreDomain && <HeaderSearchBar className="flex-1 max-w-2xl" />}
            <CurrencySelector />
            <LanguageSwitcher />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">

            <NotificationBell />

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground" aria-label={t('nav.shoppingCart')}>
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs font-medium text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <Link to="/account">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label={t('nav.myAccount')}>
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="gradient-button border-0 h-9 px-4 text-sm rounded-md">
                  {t('common.signIn')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Admin Sidebar Style */}
        <div
          className={cn(
            'md:hidden transition-all duration-300 border-t border-border',
            mobileMenuOpen ? 'max-h-[80vh] py-2 overflow-y-auto' : 'max-h-0 overflow-hidden border-t-0'
          )}
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y'
          }}
          id="mobile-nav-menu"
          role="navigation"
          aria-label="Mobile navigation"
        >
        <div className="flex flex-col gap-1 p-2">
            {/* Main Navigation — hidden on custom domains */}
            {!isCustomStoreDomain && navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation relative border-l-2",
                    isActive
                      ? "border-primary bg-muted/60 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            ))}

            {/* Resources / Categories - BuiltByBit style — hidden on custom domains */}
            {!isCustomStoreDomain && <div className="border-t border-border/40 mt-1 pt-1">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold text-primary transition-colors touch-manipulation"
              >
                <span className="flex items-center gap-3">
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  Resources
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  resourcesOpen ? "rotate-180" : ""
                )} />
              </button>
              {resourcesOpen && parentCategories && (
              <div className="flex flex-col">
                  {parentCategories.map((cat) => (
                    <NavLink
                      key={cat.id}
                      to={`/products?category=${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between pl-10 pr-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                          isActive
                            ? "text-foreground bg-muted/60"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )
                      }
                    >
                      <span>{cat.name}</span>
                    </NavLink>
                  ))}
                  {/* Templates sub-section */}
                  <div className="border-t border-border/20 mt-1 pt-1 mx-6">
                    <span className="block px-4 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Templates</span>
                    <NavLink
                      to="/store/blueprint"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center pl-4 pr-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                          isActive
                            ? "text-foreground bg-muted/60"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )
                      }
                    >
                      Roblox Templates
                    </NavLink>
                  </div>
                  <NavLink
                    to="/categories"
                    onClick={() => setMobileMenuOpen(false)}
                    className="pl-10 pr-3 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors touch-manipulation"
                  >
                    View All Categories
                  </NavLink>
                </div>
              )}
            </div>}

            
            {/* System Status — hidden on custom domains */}
            {!isCustomStoreDomain && (
            <NavLink
              to="/status"
              onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation relative border-l-2",
                  isActive
                    ? "border-primary bg-muted/60 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t('nav.systemStatus')}</span>
              <Circle className={cn('h-2.5 w-2.5 fill-current', statusConfig[systemStatus].color)} />
            </NavLink>
            )}
            
            {/* Separator */}
            {!isCustomStoreDomain && <div className="my-2 border-t border-border" />}
            
            {/* Legal & Support Links — hidden on custom domains */}
            {!isCustomStoreDomain && legalLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation relative border-l-2",
                    isActive
                      ? "border-primary bg-muted/60 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            ))}
            
            {/* User Actions */}
            {user && (
              <>
                <div className="my-2 border-t border-border" />
                
                <NavLink
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation relative border-l-2",
                      isActive
                        ? "border-primary bg-muted/60 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )
                  }
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>{t('nav.myAccount')}</span>
                </NavLink>
                
                <button
                  onClick={() => setShowSignOutDialog(true)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors touch-manipulation w-full text-left"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>{t('common.signOut')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

        {/* Sign Out Confirmation Dialog */}
        <SignOutConfirmDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
          onConfirm={handleSignOut}
          isLoading={isSigningOut}
        />
      </header>
    </>
  );
}));
