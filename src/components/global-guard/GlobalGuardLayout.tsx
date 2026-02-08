import { ReactNode, useState } from 'react';
import { GlobalGuardSidebar } from './GlobalGuardSidebar';
import { useGlobalGuardManifest } from '@/hooks/useGlobalGuardManifest';
import { Shield, Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface GlobalGuardLayoutProps {
  children: ReactNode;
}

export function GlobalGuardLayout({ children }: GlobalGuardLayoutProps) {
  useGlobalGuardManifest();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
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
