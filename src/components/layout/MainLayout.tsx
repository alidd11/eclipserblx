import { ReactNode, useState, useCallback } from 'react';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useDeferredScheduledReleaseCheck } from '@/hooks/useScheduledReleaseCheck';
import { safeStorage } from '@/lib/safeStorage';

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  
}

const COLLAPSE_KEY = 'sidebar-collapsed';

function MainLayoutContent({ children, showFooter = true }: MainLayoutProps) {
  useDeferredScheduledReleaseCheck();

  const [collapsed, setCollapsed] = useState(() => safeStorage.getItem(COLLAPSE_KEY) === 'true');

  const handleToggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      safeStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <LayoutShell
      desktopSidebar={
        <CustomerSidebar collapsed={collapsed} onToggle={handleToggle} />
      }
      mobileSidebar={(onClose) => (
        <CustomerSidebar
          collapsed={false}
          onToggle={onClose}
          onNavigate={onClose}
          isMobileDrawer
        />
      )}
      headerProps={{ mobileFixed: true, showDesktopNav: true }}
      showFooter={showFooter}
      mainStyle={{ paddingBottom: 'calc(var(--chat-safe-bottom, var(--bottom-safe-area, 0px)) + var(--tab-bar-height, 0px))' }}
    >
      <PageTransition>{children}</PageTransition>
    </LayoutShell>
  );
}

export function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  return <MainLayoutContent showFooter={showFooter}>{children}</MainLayoutContent>;
}
