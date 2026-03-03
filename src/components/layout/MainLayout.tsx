import { ReactNode, forwardRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutShell } from './LayoutShell';
import { PageTransition } from './PageTransition';
import { CustomerSidebar } from './CustomerSidebar';
import { useScheduledReleaseCheck } from '@/hooks/useScheduledReleaseCheck';
import { useIOSChatKeyboard } from '@/hooks/useIOSChatKeyboard';

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
  useIOSChatKeyboard(isChatPage);

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
