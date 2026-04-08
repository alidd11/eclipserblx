import { ReactNode, useState, lazy, Suspense } from 'react';
import { MaintenanceBanner } from '@/components/layout/MaintenanceBanner';
import { cn } from '@/lib/utils';
import { GlobalCategoryBar } from '@/components/shop/GlobalCategoryBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Header } from '@/components/layout/Header';
// Lazy-load below-fold Footer to reduce initial bundle
const Footer = lazy(() => import('@/components/layout/Footer').then(m => ({ default: m.Footer })));
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
  /**
   * When true (default when customHeader is provided), LayoutShell automatically
   * renders a spacer after the header to prevent content from being hidden behind
   * a fixed/sticky header + device safe-area. Set to false to opt out.
   */
  fixedHeaderSpacer?: boolean;
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
  /** Enable flex height chain for chat/ticket pages (prevents black gap on mobile) */
  chatMode?: boolean;
}

function LayoutShellInner({
  children,
  desktopSidebar,
  mobileSidebar,
  headerProps = {},
  customHeader,
  fixedHeaderSpacer,
  showFooter = true,
  showFABs = true,
  extra,
  mainStyle,
  contentClassName,
  wrapperClassName,
  wrapperStyle,
  mainClassName,
  innerClassName,
  chatMode,
}: LayoutShellProps) {
  // Default: auto-add spacer when customHeader is provided (fixed headers need it)
  const shouldRenderSpacer = fixedHeaderSpacer ?? !!customHeader;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useSearchCommand();

  useEdgeSwipe({
    onSwipe: () => setMobileOpen(true),
    disabled: mobileOpen,
  });

  return (
    <>
      <MaintenanceBanner />
      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>

      <div
        className={wrapperClassName ?? "flex w-full overflow-x-hidden relative max-w-full min-w-0"}
        style={wrapperStyle ? { minHeight: 'var(--app-vh, 100dvh)', ...wrapperStyle } : { minHeight: 'var(--app-vh, 100dvh)' }}
      >
        {/* Desktop sidebar removed — drawer-only pattern */}

        {/* Mobile Sidebar Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 sm:max-w-[320px] border-r-0 bg-sidebar overflow-hidden pt-[env(safe-area-inset-top)]"
            style={{ height: 'var(--app-vh, 100dvh)', maxHeight: 'var(--app-vh, 100dvh)' }}
            data-gesture-exempt="true"
            hideCloseButton
          >
            {mobileSidebar(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>

        {/* Main Content */}
      <div className={innerClassName ?? "flex-1 flex flex-col min-w-0"}>
          {customHeader ? (
            <>
              {customHeader(() => setMobileOpen(true))}
              {/* Auto-spacer: prevents content from hiding behind fixed custom headers.
                  Height = safe-area-inset-top + header height (~3rem).
                  On non-notched devices env() resolves to 0, so spacer = 3rem (header only).
                  Opt out via fixedHeaderSpacer={false}. */}
              {shouldRenderSpacer && (
                <div
                  className="shrink-0 lg:hidden"
                  style={{ height: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
                  aria-hidden="true"
                />
              )}
            </>
          ) : (
            <div className="sticky top-0 z-50 gpu-layer" style={{ willChange: 'transform' }}>
              <Header
                showDesktopNav={false}
                onMenuClick={() => setMobileOpen(true)}
                className="backdrop-blur-md bg-background/95"
                {...headerProps}
              />
              <GlobalCategoryBar />
            </div>
          )}
          <main
            id="main-content"
            className={mainClassName ?? "flex-1 max-w-full min-w-0"}
            style={mainStyle ?? { paddingBottom: 'var(--bottom-safe-area, 0px)' }}
          >
            <div className={cn("w-full", chatMode && "flex-1 flex flex-col min-h-0 overflow-hidden")}>
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
