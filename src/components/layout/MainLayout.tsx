import { ReactNode } from 'react';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useAutoPageMeta } from '@/hooks/useAutoPageMeta';

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

function MainLayoutContent({ children, showFooter = true }: MainLayoutProps) {
  useAutoPageMeta();


  return (
    <LayoutShell
      desktopSidebar={null}
      mobileSidebar={(onClose) => (
        <CustomerSidebar
          onNavigate={onClose}
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
