import { ReactNode, forwardRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useScheduledReleaseCheck } from '@/hooks/useScheduledReleaseCheck';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayoutContent = forwardRef<HTMLDivElement, MainLayoutProps>(function MainLayoutContent({ children }, _ref) {
  const location = useLocation();

  // Check for scheduled product releases periodically
  useScheduledReleaseCheck();

  // Detect if we're on a chat-like page that needs iOS keyboard handling
  const isChatPage = location.pathname.includes('/forum/general');

  // iOS PWA keyboard handling for chat pages
  useEffect(() => {
    const html = document.documentElement;

    if (!isChatPage) {
      html.style.removeProperty('--chat-safe-bottom');
      html.style.removeProperty('--chat-vvh');
      delete html.dataset.chatKeyboard;
      return;
    }

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

      if (!isInputFocused) baseVvHeight = Math.max(baseVvHeight, vvHeight);

      const keyboardHeight = Math.max(0, baseVvHeight - vvHeight);
      const keyboardOpen = isInputFocused && keyboardHeight > 80;

      html.style.setProperty('--chat-vvh', `${vvHeight}px`);
      html.style.setProperty(
        '--chat-safe-bottom',
        keyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 4px)',
      );
      html.dataset.chatKeyboard = keyboardOpen ? 'open' : 'closed';
    };

    const updateStaggered = () => {
      timers.forEach(t => clearTimeout(t));
      updateViewport();
      timers = [50, 150, 300, 500].map(ms => window.setTimeout(updateViewport, ms));
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
    <LayoutShell
      desktopSidebar={
        <CustomerSidebar collapsed={false} onToggle={() => {}} />
      }
      mobileSidebar={(onClose) => (
        <CustomerSidebar
          collapsed={false}
          onToggle={onClose}
          onNavigate={onClose}
          isMobileDrawer
        />
      )}
      mainStyle={{ paddingBottom: 'var(--chat-safe-bottom, env(safe-area-inset-bottom))' }}
    >
      <PageTransition>{children}</PageTransition>
    </LayoutShell>
  );
});

export const MainLayout = forwardRef<HTMLDivElement, MainLayoutProps>(function MainLayout({ children }, _ref) {
  return <MainLayoutContent>{children}</MainLayoutContent>;
});
