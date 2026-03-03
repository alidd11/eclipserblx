import { ReactNode, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Header } from '@/components/layout/Header';
import { UniversalBreadcrumb } from '@/components/layout/UniversalBreadcrumb';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { FloatingActionButtons } from '@/components/ui/FloatingActionButtons';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { SearchCommandPalette } from '@/components/search/SearchCommandPalette';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

interface LayoutShellProps {
  children: ReactNode;
  /** Desktop sidebar element (hidden on mobile) */
  desktopSidebar: ReactNode;
  /** Mobile sidebar element rendered inside the drawer sheet */
  mobileSidebar: (onClose: () => void) => ReactNode;
  /** Props forwarded to Header */
  headerProps?: {
    showDesktopNav?: boolean;
    hideBrandName?: boolean;
  };
  /** Extra content rendered after the layout (e.g. ChatWidget) */
  extra?: ReactNode;
  /** Custom main padding style */
  mainStyle?: React.CSSProperties;
  /** CSS class applied to the content wrapper inside <main> */
  contentClassName?: string;
  /** CSS class applied to the outer wrapper div */
  wrapperClassName?: string;
  /** CSS class applied to <main> */
  mainClassName?: string;
}

function LayoutShellInner({
  children,
  desktopSidebar,
  mobileSidebar,
  headerProps = {},
  extra,
  mainStyle,
  contentClassName,
  wrapperClassName,
  mainClassName,
}: LayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();

  useEdgeSwipe({
    onSwipe: () => setMobileOpen(true),
    disabled: mobileOpen,
  });

  return (
    <>
      <ScrollProgressIndicator />
      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>

      <div className={wrapperClassName ?? "min-h-[100dvh] flex w-full overflow-x-hidden relative"}>
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">{desktopSidebar}</div>

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-64 border-r-0 !h-[100dvh] !max-h-[100dvh] bg-card overflow-hidden"
            style={{ height: '100dvh', maxHeight: '100dvh' }}
            data-gesture-exempt="true"
            hideCloseButton
          >
            {mobileSidebar(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>

        {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
          <Header
            showDesktopNav={false}
            onMenuClick={() => setMobileOpen(true)}
            {...headerProps}
          />
          <UniversalBreadcrumb />
          <main
            id="main-content"
            className={mainClassName ?? "flex-1 overflow-y-auto overflow-x-hidden"}
            style={mainStyle ?? { paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {contentClassName ? (
              <div className={contentClassName}>{children}</div>
            ) : (
              children
            )}
            <Footer />
          </main>
        </div>
      </div>

      <FloatingActionButtons />
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      {extra}
    </>
  );
}

export function LayoutShell(props: LayoutShellProps) {
  return (
    <SearchCommandProvider>
      <LayoutShellInner {...props} />
    </SearchCommandProvider>
  );
}
