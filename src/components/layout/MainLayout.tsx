import { ReactNode, forwardRef, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CustomerSidebar } from './CustomerSidebar';
import { UniversalBreadcrumb } from './UniversalBreadcrumb';

import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { useScheduledReleaseCheck } from '@/hooks/useScheduledReleaseCheck';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const location = useLocation();
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();

  // Check for scheduled product releases periodically
  useScheduledReleaseCheck();

  // Detect if we're on a chat-like page that needs iOS keyboard handling
  const isChatPage = location.pathname.includes('/forum/general');

  // iOS PWA keyboard handling for chat pages (similar to AdminLayout)
  useEffect(() => {
    const html = document.documentElement;

    if (!isChatPage) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

    // Initialize CSS variables for safe-area handling
    html.style.setProperty('--chat-safe-bottom', 'calc(env(safe-area-inset-bottom) + 4px)');
    html.style.setProperty('--chat-vvh', '100dvh');
    html.dataset.chatKeyboard = 'closed';

    let disposed = false;
    let baseVvHeight = window.visualViewport?.height ?? window.innerHeight;
    let timers: number[] = [];

    const updateViewport = () => {
      if (disposed) return;

      const vv = window.visualViewport;
      const vvHeight = vv?.height ?? window.innerHeight;

      const activeEl = document.activeElement;
      const isInputFocused =
        !!activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (!isInputFocused) {
        baseVvHeight = Math.max(baseVvHeight, vvHeight);
      }

      const keyboardHeight = Math.max(0, baseVvHeight - vvHeight);
      const keyboardOpen = isInputFocused && keyboardHeight > 80;

      html.style.setProperty('--chat-vvh', `${vvHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 4px)'
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    const updateStaggered = () => {
      timers.forEach(t => clearTimeout(t));
      updateViewport();
      timers = [
        window.setTimeout(updateViewport, 50),
        window.setTimeout(updateViewport, 150),
        window.setTimeout(updateViewport, 300),
        window.setTimeout(updateViewport, 500),
      ];
    };

    updateStaggered();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateViewport);
    vv?.addEventListener('scroll', updateViewport);
    document.addEventListener('focusin', updateStaggered);
    document.addEventListener('focusout', updateStaggered);

    return () => {
      disposed = true;
      timers.forEach(t => clearTimeout(t));
      vv?.removeEventListener('resize', updateViewport);
      vv?.removeEventListener('scroll', updateViewport);
      document.removeEventListener('focusin', updateStaggered);
      document.removeEventListener('focusout', updateStaggered);

      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
    };
  }, [isChatPage]);

  return (
    <>
      <ScrollProgressIndicator />
      <div className="min-h-[100dvh] flex w-full overflow-x-hidden relative">
        {/* Desktop Sidebar - expanded */}
        <CustomerSidebar
          collapsed={false}
          onToggle={() => {}}
          className="hidden md:flex"
        />
        
        {/* Mobile Sidebar - always visible, collapsed */}
        <CustomerSidebar
          collapsed={true}
          onToggle={() => {}}
          className="flex md:hidden"
        />
        
        {/* Main Content - Fixed header with scrollable content */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          <Header showDesktopNav={false} />
          <UniversalBreadcrumb />
          <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: 'var(--chat-safe-bottom, env(safe-area-inset-bottom))' }}>
            {children}
            <Footer />
          </main>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingActionButtons />

      {/* Search Command Palette */}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(
  function MainLayout({ children }, ref) {
    return (
      <SearchCommandProvider>
        <div ref={ref}>
          <MainLayoutContent>{children}</MainLayoutContent>
        </div>
      </SearchCommandProvider>
    );
  }
);
