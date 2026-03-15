import { ReactNode } from 'react';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useDeferredScheduledReleaseCheck } from '@/hooks/useScheduledReleaseCheck';

interface MainLayoutProps {
  children: ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  // Deferred: waits for idle before starting polling
  useDeferredScheduledReleaseCheck();

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
