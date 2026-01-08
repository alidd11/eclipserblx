import { useState } from 'react';
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, ChevronLeft, ChevronRight, MessageCircle, FileText, Star, TrendingUp, Activity, ClipboardList, Mail, BarChart3, HelpCircle, AlertTriangle, Tags } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SITE_NAME } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SignOutConfirmDialog } from '@/components/auth/SignOutConfirmDialog';

const navItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: [] },
  { title: 'Analytics', icon: BarChart3, href: '/admin/analytics', roles: ['admin'] },
  { title: 'Income', icon: TrendingUp, href: '/admin/income', roles: ['admin'] },
  { title: 'Staff Activity', icon: Activity, href: '/admin/staff-activity', roles: ['admin'] },
  { title: 'Staff Messages', icon: Mail, href: '/admin/staff-messages', roles: [] },
  { title: 'Products', icon: Package, href: '/admin/products', roles: ['admin', 'product_manager'] },
  { title: 'Discounts', icon: Tags, href: '/admin/discounts', roles: ['admin'] },
  { title: 'Orders', icon: ShoppingCart, href: '/admin/orders', roles: ['admin', 'order_manager'] },
  { title: 'Reviews', icon: Star, href: '/admin/reviews', roles: ['admin'] },
  { title: 'Live Chat', icon: MessageCircle, href: '/admin/live-chat', roles: ['admin', 'support_agent'] },
  { title: 'Applications', icon: FileText, href: '/admin/applications', roles: ['admin', 'recruiter'] },
  { title: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { title: 'Subscribers', icon: Mail, href: '/admin/subscribers', roles: ['admin'] },
  { title: 'Incidents', icon: AlertTriangle, href: '/admin/incidents', roles: ['admin'] },
  { title: 'Audit Logs', icon: ClipboardList, href: '/admin/audit-logs', roles: ['admin'] },
  { title: 'Settings', icon: Settings, href: '/admin/settings', roles: ['admin'] },
  { title: 'Help', icon: HelpCircle, href: '/admin/help', roles: [] },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

export function AdminSidebar({ collapsed, onToggle, onNavigate, isMobileDrawer = false }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const { isAdmin, hasRole } = useAdminAuth();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate('/');
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  const filteredItems = navItems.filter(item => 
    item.roles.length === 0 || isAdmin || item.roles.some(role => hasRole(role))
  );

  // In mobile drawer mode, always show full sidebar (never collapsed)
  const isCollapsed = isMobileDrawer ? false : collapsed;

  return (
    <aside className={cn(
      "border-r border-border bg-card flex flex-col transition-all duration-300 shrink-0",
      isMobileDrawer ? "h-full w-full" : "h-screen sticky top-0",
      !isMobileDrawer && (isCollapsed ? "w-14" : "w-64")
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        {!isCollapsed && (
          <>
            <h1 className="font-display font-bold text-xl">{SITE_NAME}</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </>
        )}
        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <span className="font-display font-bold text-lg">E</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{SITE_NAME}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const LinkContent = (
            <>
              <item.icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="min-w-0 truncate leading-none">{item.title}</span>
              )}
            </>
          );

          const linkClassName = ({ isActive }: { isActive: boolean }) =>
            cn(
              "rounded-lg transition-colors text-sm font-medium",
              isCollapsed
                ? "flex items-center justify-center py-2.5"
                : "flex flex-row flex-nowrap items-center gap-3 px-3 py-2.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            );

          if (!isCollapsed) {
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/admin'}
                onClick={handleNavClick}
                className={linkClassName}
              >
                {LinkContent}
              </NavLink>
            );
          }

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.href}
                  end={item.href === '/admin'}
                  onClick={handleNavClick}
                  className={linkClassName}
                >
                  {LinkContent}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{item.title}</TooltipContent>
            </Tooltip>
          );
        })}

        {/* Sign Out - inline with nav items on mobile for visibility */}
        {isMobileDrawer && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg px-3 py-2.5 mt-2"
            onClick={() => setShowSignOutDialog(true)}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3">Sign Out</span>
          </Button>
        )}
      </nav>

      {/* Footer - Desktop only (mobile Sign Out is inline with nav) */}
      {!isMobileDrawer && (
        <div className="p-2 border-t border-border space-y-1">

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full text-muted-foreground hover:text-foreground",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
          onClick={onToggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-3" />
              Collapse
            </>
          )}
        </Button>

        {/* Sign Out */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-muted-foreground hover:text-destructive",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={() => setShowSignOutDialog(true)}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="ml-3">Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <SignOutConfirmDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOut}
        isLoading={isSigningOut}
      />
    </aside>
  );
}
