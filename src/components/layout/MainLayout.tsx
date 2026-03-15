import { ReactNode } from 'react';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useEffect, useRef } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  // Defer scheduled release check to avoid blocking initial render
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current) return;
    imported.current = true;
    const id = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(() => {
          import('@/hooks/useScheduledReleaseCheck');
        })
      : setTimeout(() => {
          import('@/hooks/useScheduledReleaseCheck');
        }, 5000);
    return () => {
      if (typeof cancelIdleCallback === 'function' && typeof id === 'number') {
        cancelIdleCallback(id);
      }
    };
  }, []);

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
      headerProps={{ mobileFixed: true }}
      mainStyle={{ paddingBottom: 'calc(var(--chat-safe-bottom, env(safe-area-inset-bottom)) + var(--tab-bar-height, 0px))' }}
    >
      <PageTransition>{children}</PageTransition>
    </LayoutShell>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return <MainLayoutContent>{children}</MainLayoutContent>;
}
