import { ReactNode, useState, lazy, Suspense } from 'react';
import { GlobalCategoryBar } from '@/components/shop/GlobalCategoryBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Header } from '@/components/layout/Header';
import { useScrollDirection } from '@/hooks/useScrollDirection';
// Lazy-load below-fold Footer to reduce initial bundle
const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));
// Lazy-load breadcrumb — non-critical for initial paint
const UniversalBreadcrumb = lazy(() => import('@/components/layout/UniversalBreadcrumb').then(m => ({ default: m.UniversalBreadcrumb })));
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { SearchCommandProvider, useSearchCommand } from '@/hooks/useSearchCommand';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

// Lazy-load search palette — only needed when user presses Cmd+K
const SearchCommandPalette = lazy(() => import('@/components/search/SearchCommandPalette').then(m => ({ default: m.SearchCommandPalette })));

// Lazy-load FABs — only needed after user scrolls, imports framer-motion
const FloatingActionButtons = lazy(() => import('@/components/ui/FloatingActionButtons').then(m => ({ default: m.FloatingActionButtons })));

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
    mobileFixed?: boolean;
  };
  /** Completely replace the default Header with a custom element */
  customHeader?: (onMenuClick: () => void) => ReactNode;
  /** Show the universal breadcrumb below the header (default: true) */
  showBreadcrumb?: boolean;
  /** Show the footer at the bottom of main (default: true) */
  showFooter?: boolean;
  /** Show floating action buttons (default: true) */
  showFABs?: boolean;
  /** Extra content rendered after the layout (e.g. ChatWidget) */
  extra?: ReactNode;
  /** Custom main padding style */
  mainStyle?: React.CSSProperties;
  /** CSS class applied to the content wrapper inside <main> */
  contentClassName?: string;
  /** CSS class applied to the outer wrapper div */
  wrapperClassName?: string;
  /** Inline style applied to the outer wrapper div */
  wrapperStyle?: React.CSSProperties;
  /** CSS class applied to <main> */
  mainClassName?: string;
  /** CSS class applied to the inner column container (default: md-only height) */
  innerClassName?: string;
}

function LayoutShellInner({
  children,
  desktopSidebar,
  mobileSidebar,
  headerProps = {},
  customHeader,
  showBreadcrumb = true,
  showFooter = true,
  showFABs = true,
  extra,
  mainStyle,
  contentClassName,
  wrapperClassName,
  wrapperStyle,
  mainClassName,
  innerClassName,
}: LayoutShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();
  const scrollDir = useScrollDirection(12);
  const headerHidden = scrollDir === 'down';

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

      <div
        className={wrapperClassName ?? "min-h-[100dvh] flex w-full overflow-x-clip relative max-w-full min-w-0"}
        style={wrapperStyle}
      >
        {/* Desktop Sidebar */}
        <div className="hidden lg:block flex-shrink-0">
          {desktopSidebar}
        </div>

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-[280px] border-r-0 bg-sidebar overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            style={{ height: '100dvh', maxHeight: '100dvh' }}
            data-gesture-exempt="true"
            hideCloseButton
          >
            {mobileSidebar(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>

        {/* Main Content */}
      <div className={innerClassName ?? "flex-1 flex flex-col min-w-0"}>
          {customHeader ? (
            customHeader(() => setMobileOpen(true))
          ) : (
            <div
              className="sticky top-0 z-50 transition-transform duration-300 ease-out"
              style={{ transform: headerHidden ? 'translateY(-100%)' : 'translateY(0)' }}
            >
              <Header
                showDesktopNav={false}
                onMenuClick={() => setMobileOpen(true)}
                className="backdrop-blur-md bg-background/95"
                {...headerProps}
              />
              <GlobalCategoryBar />
            </div>
          )}
          {showBreadcrumb && (
            <Suspense fallback={null}><UniversalBreadcrumb /></Suspense>
          )}
          <main
            id="main-content"
            className={mainClassName ?? "flex-1 overflow-x-clip max-w-full min-w-0"}
            style={mainStyle ?? { paddingBottom: 'var(--bottom-safe-area, 0px)' }}
          >
            <div className="w-full">
              {contentClassName ? (
                <div className={contentClassName}>{children}</div>
              ) : (
                children
              )}
            </div>
            {showFooter && (
              <Suspense fallback={null}><Footer /></Suspense>
            )}
          </main>
        </div>
      </div>

      {showFABs && (
        <Suspense fallback={null}>
          <FloatingActionButtons />
        </Suspense>
      )}
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
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
