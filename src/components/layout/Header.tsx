import { memo, useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Circle, Package, Grid3X3, MessageSquare, Briefcase, FileText, Shield, RotateCcw, HelpCircle, Activity, LogOut, Sparkles, Search } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { useSearchCommand } from '@/hooks/useSearchCommand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { supabase } from '@/integrations/supabase/client';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { HeaderSearchBar } from './HeaderSearchBar';
import { CurrencySelector } from './CurrencySelector';

const navLinks = [
  { href: '/featured', label: 'Featured', icon: Sparkles },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: Grid3X3 },
  { href: '/eclipse-plus', label: 'Eclipse+', icon: Circle },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
];
const legalLinks = [
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/privacy', label: 'Privacy Policy', icon: Shield },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/refunds', label: 'Refund Policy', icon: RotateCcw },
];

type SystemStatus = 'online' | 'degraded' | 'offline' | 'checking';

// Mobile search button that opens the command palette
function MobileSearchButton() {
  const { setOpen } = useSearchCommand();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
      onClick={() => setOpen(true)}
      aria-label="Search"
    >
      <Search className="h-4 w-4 sm:h-5 sm:w-5" />
    </Button>
  );
}

interface HeaderProps {
  showDesktopNav?: boolean;
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
}

export const Header = memo(function Header({ showDesktopNav = true, onMenuClick, onSidebarToggle }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const { discordUrl } = useDiscordUrl();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('checking');
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    setMobileMenuOpen(false);
  };

  // Check system status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const start = Date.now();
        const { error } = await supabase.from('categories').select('id').limit(1);
        const latency = Date.now() - start;
        
        if (error) {
          setSystemStatus('offline');
        } else if (latency > 2000) {
          setSystemStatus('degraded');
        } else {
          setSystemStatus('online');
        }
      } catch {
        setSystemStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    online: { label: 'All Systems Operational', color: 'text-green-500', bg: 'bg-green-500' },
    degraded: { label: 'Degraded Performance', color: 'text-yellow-500', bg: 'bg-yellow-500' },
    offline: { label: 'Service Disruption', color: 'text-red-500', bg: 'bg-red-500' },
    checking: { label: 'Checking Status...', color: 'text-muted-foreground', bg: 'bg-muted-foreground' },
  };

  return (
<header className="sticky top-0 z-50 w-full glass-effect pt-[env(safe-area-inset-top)]">
      <div className="px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Left side - Back button + Mobile menu + Logo */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Native-style Back Button */}
            <BackButton showLabel={false} className="sm:hidden" />
            <BackButton showLabel={true} className="hidden sm:flex" />

            {/* Mobile menu button - uses onMenuClick if provided, otherwise internal state */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (onMenuClick) {
                  onMenuClick();
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
            >
              {!onMenuClick && mobileMenuOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            {/* Logo - only show on mobile (sidebar shows it on desktop) */}
            <Link to="/" className="flex items-center gap-3 md:hidden">
              <EclipseLogo size="sm" />
              <span className="brand-text text-base gradient-text hidden sm:block">
                {SITE_NAME}
              </span>
            </Link>
          </div>

          {/* Desktop: Branding + Search Bar + Currency */}
          {/* Desktop: Branding + Search Bar + Currency */}
          <div className="hidden md:flex items-center gap-4 flex-1">
            {/* Branding - Always visible and fixed position in header */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <EclipseLogo size="sm" />
              <span className="brand-text text-lg gradient-text whitespace-nowrap tracking-[0.25em]">
                {SITE_NAME}
              </span>
            </Link>
            <HeaderSearchBar className="flex-1 max-w-xl" />
            <CurrencySelector />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Discord - hidden on very small screens */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xs:block"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </Button>
            </a>

            {/* Mobile Search Button - opens command palette */}
            <MobileSearchButton />

            <NotificationBell />


            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-[10px] sm:text-xs font-medium text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <Link to="/account">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="gradient-button border-0 h-8 min-h-0 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm rounded-md">
                  Sign In
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
        >
        <nav className="flex flex-col gap-1 p-2">
            {/* Mobile Search Bar + Currency */}
            <div className="flex items-center gap-2 mb-2">
              <HeaderSearchBar className="flex-1" />
              <CurrencySelector compact />
            </div>
            
            {/* Main Navigation */}
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )
                }
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            ))}
            
            {/* Discord Link */}
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors touch-manipulation"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Join Discord</span>
            </a>
            
            {/* System Status */}
            <NavLink
              to="/status"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors touch-manipulation",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )
              }
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span className="flex-1">System Status</span>
              <Circle className={cn('h-2.5 w-2.5 fill-current', statusConfig[systemStatus].color)} />
            </NavLink>
            
            {/* Separator */}
            <div className="my-2 border-t border-border" />
            
            {/* Legal & Support Links */}
            {legalLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors touch-manipulation",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )
                  }
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>My Account</span>
                </NavLink>
                
                <button
                  onClick={() => setShowSignOutDialog(true)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors touch-manipulation w-full text-left"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </header>
  );
});
