import { useState } from 'react';
import { 
  Shield, LayoutDashboard, Gavel, FileText, Radar, Settings, 
  LogOut, ChevronDown, LucideIcon, ExternalLink, CreditCard, Mail
} from 'lucide-react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';
import { hapticTap } from '@/lib/haptics';

interface NavItem {
  title: string;
  icon: LucideIcon;
  href: string;
}

const navItems: NavItem[] = [
  { title: 'Overview', icon: LayoutDashboard, href: '/ip-shield/dashboard' },
  { title: 'Takedowns', icon: Gavel, href: '/ip-shield/dashboard/takedowns' },
  { title: 'IP Registry', icon: FileText, href: '/ip-shield/dashboard/registry' },
  { title: 'Copy Detection', icon: Radar, href: '/ip-shield/dashboard/detections' },
  { title: 'Correspondence', icon: Mail, href: '/ip-shield/dashboard/correspondence' },
  { title: 'Subscription', icon: CreditCard, href: '/ip-shield/dashboard/settings' },
];

interface IPShieldSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
  className?: string;
}

export function IPShieldSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false, className }: IPShieldSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isCollapsed = isMobileDrawer ? false : collapsed;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  const handleNavClick = () => {
    hapticTap();
    onNavigate?.();
  };

  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/ip-shield/dashboard' && location.pathname.startsWith(item.href));

    const content = (
      <>
        <item.icon className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "stroke-[2.25]" : "stroke-[1.75] text-muted-foreground group-hover:text-foreground"
        )} />
        {!isCollapsed && (
          <span className="min-w-0 truncate flex-1">{item.title}</span>
        )}
      </>
    );

    const linkClass = cn(
      "group rounded-md text-[13px] font-medium select-none transition-all duration-150 relative",
      "active:scale-[0.98] active:opacity-90",
      isCollapsed
        ? "flex items-center justify-center p-2"
        : "flex items-center gap-2.5 px-2.5 py-1.5",
      isActive
        ? "border-l-2 border-primary bg-muted/60 text-foreground !rounded-l-none pl-[calc(0.625rem-2px)]"
        : "text-foreground/80 hover:text-foreground hover:bg-muted/60"
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link to={item.href} onClick={handleNavClick} className={linkClass}>
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href === '/ip-shield/dashboard'}
        onClick={handleNavClick}
        className={linkClass}
      >
        {content}
      </NavLink>
    );
  };

  return (
    <aside className={cn(
      "flex flex-col transition-all duration-300 shrink-0 overflow-x-hidden",
      "bg-card text-foreground",
      isMobileDrawer 
        ? "h-full w-full border-0 max-h-[100dvh]" 
        : "h-[100dvh] sticky top-0 border-r border-border",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-56"),
      className
    )}>
      {/* Header */}
      <div className="border-b border-border/50 overflow-hidden">
        {!isCollapsed ? (
          <div className={cn("relative px-3 pb-2.5 flex items-center gap-2.5", isMobileDrawer ? "pt-3" : "pt-4")}>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display font-bold text-sm text-foreground truncate">IP Shield</h1>
              <p className="text-[11px] text-muted-foreground/60 leading-none mt-0.5">DMCA Protection</p>
            </div>
            {isMobileDrawer ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-muted/60"
                    onClick={() => { hapticTap(); setShowSignOutDialog(true); }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <div className="relative px-1 pb-2 pt-4 flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">IP Shield</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-1.5 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0">
        <div className="space-y-px">
          {navItems.map(item => renderNavLink(item))}
        </div>
      </nav>
      
      {/* Footer */}
      <div className="border-t border-border/50 p-1.5 space-y-px">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/ip-shield"
                onClick={handleNavClick}
                className="flex items-center justify-center p-2.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">View Plans</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/ip-shield"
            onClick={handleNavClick}
            className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Plans</span>
          </Link>
        )}
      </div>

      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
