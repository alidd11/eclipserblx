import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';

// Opening hours configuration (24-hour format)
const OPENING_HOURS: Record<number, { open: number; close: number } | null> = {
  0: null, // Sunday - Closed
  1: { open: 9, close: 19 }, // Monday 9am-7pm
  2: { open: 9, close: 19 }, // Tuesday 9am-7pm
  3: { open: 9, close: 19 }, // Wednesday 9am-7pm
  4: { open: 9, close: 19 }, // Thursday 9am-7pm
  5: { open: 9, close: 19 }, // Friday 9am-7pm
  6: { open: 9, close: 19 }, // Saturday 9am-7pm
};

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const todayHours = OPENING_HOURS[day];
  const isOpen = todayHours ? hour >= todayHours.open && hour < todayHours.close : false;

  return { isOpen };
}

export function ChatWidget() {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  const status = getOpeningStatus();

  // Hide the chat widget on admin pages only
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) return null;

  return (
    <button
      type="button"
      data-gesture-exempt="true"
      onClick={toggleChat}
      className="fixed z-[9999] h-14 w-14 rounded-full gradient-button shadow-lg touch-manipulation cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
      style={{
        WebkitTapHighlightColor: 'transparent',
        bottom: 'max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
        right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)',
      }}
      aria-label={isOpen ? 'Close live chat' : 'Open live chat'}
    >
      {/* Icon */}
      <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />

      {/* Open/Closed dot */}
      <span
        aria-hidden="true"
        className={`absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
          status.isOpen ? 'bg-success' : 'bg-warning'
        }`}
      />

      {/* Unread badge */}
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      <span className="sr-only">Live chat</span>
    </button>
  );
}
