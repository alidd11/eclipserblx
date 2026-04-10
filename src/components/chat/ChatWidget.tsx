import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { useDevice } from '@/hooks/useDevice';
import { forwardRef } from 'react';

// Opening hours configuration (24-hour format)
const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null,
  1: { open: 9, close: 19 },
  2: { open: 9, close: 19 },
  3: { open: 9, close: 19 },
  4: { open: 9, close: 19 },
  5: { open: 9, close: 19 },
  6: { open: 9, close: 19 },
};

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const todayHours = OPENING_HOURS[day];
  const isOpen = todayHours ? hour >= todayHours.open && hour < todayHours.close : false;
  return { isOpen };
}

export const ChatWidget = forwardRef<HTMLButtonElement>(function ChatWidget(_props, _ref) {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  const { showBanner, showSettings } = useCookieConsent();
  const status = getOpeningStatus();

  const { isMobile } = useDevice();
  const cookieBannerVisible = showBanner && !showSettings;
  // On mobile (<768px), offset above the tab bar (56px + safe area)
  const tabBarOffset = isMobile ? '5rem' : '0px';
  // When cookie banner is visible, push chat widget above it (banner ~4.5rem + gap)
  const bottomOffset = cookieBannerVisible
    ? `calc(8rem + ${tabBarOffset} + env(safe-area-inset-bottom, 0px))`
    : `calc(${tabBarOffset} + max(1.5rem, env(safe-area-inset-bottom, 0px) + 1rem))`;

  const { isCustomStoreDomain } = useStoreDomain();

  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isAdminRoute || isCustomStoreDomain) return null;

  return (
    <button
      type="button"
      data-gesture-exempt="true"
      onClick={toggleChat}
      className="fixed z-[9999] h-14 w-14 rounded-full gradient-button shadow-lg touch-manipulation cursor-pointer flex items-center justify-center transition-transform contain-layout"
      data-cls-ignore="true"
      style={{
        WebkitTapHighlightColor: 'transparent',
        bottom: bottomOffset,
        right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 1rem)',
      }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
      <span
        aria-hidden="true"
        className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
          status.isOpen ? 'bg-success' : 'bg-primary'
        }`}
      />
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -bottom-1 -left-1 h-6 min-w-6 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
      <span className="sr-only">Chat support</span>
    </button>
  );
});
