import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlobalGuardSidebar } from './GlobalGuardSidebar';
import { useGlobalGuardManifest } from '@/hooks/useGlobalGuardManifest';
import { useGlobalGuardSession } from '@/hooks/useGlobalGuardSession';
import { Shield, Menu, LogOut, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GlobalGuardLayoutProps {
  children: ReactNode;
}

export function GlobalGuardLayout({ children }: GlobalGuardLayoutProps) {
  useGlobalGuardManifest();
  const navigate = useNavigate();
  const { discordUser, logout } = useGlobalGuardSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/guard', { replace: true });
  };

  const getAvatarUrl = () => {
    if (!discordUser?.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex">
      {/* Desktop Sidebar */}
      <GlobalGuardSidebar className="hidden md:flex" />
      
      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent 
          side="left" 
          className="p-0 w-64 border-r-0 bg-card overflow-hidden"
          hideCloseButton
        >
          <GlobalGuardSidebar 
            isMobile 
            onNavigate={() => setMobileOpen(false)} 
          />
        </SheetContent>
      </Sheet>
      
      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-[100dvh]">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileOpen(true)}
              className="shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">Global Guard</span>
            </div>
          </div>
          
          {/* User Menu (Mobile) */}
          {discordUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={getAvatarUrl() || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {discordUser.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{discordUser.global_name || discordUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{discordUser.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Desktop Header with User */}
        <div className="hidden md:flex sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-3 justify-end">
          {discordUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={getAvatarUrl() || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {discordUser.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {discordUser.global_name || discordUser.username}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{discordUser.global_name || discordUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{discordUser.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export function GlobalGuardHeader() {
  return (
    <div className="flex items-center gap-3 mb-6 md:mb-8">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
        <Shield className="w-5 h-5 md:w-7 md:h-7 text-white" />
      </div>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Global Guard</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Cross-Server Ban Management</p>
      </div>
    </div>
  );
}
