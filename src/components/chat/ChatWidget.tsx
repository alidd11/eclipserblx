import { useLocation, Link } from 'react-router-dom';
import { MessageCircle, HelpCircle, Users, X } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';
import { useState } from 'react';

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${period}`;
}

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  const todayHours = OPENING_HOURS[day];
  const isOpen = todayHours ? hour >= todayHours.open && hour < todayHours.close : false;

  return { isOpen, currentDay: day };
}

export function ChatWidget() {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  const status = getOpeningStatus();
  const [showHours, setShowHours] = useState(false);

  // Hide the chat widget on admin pages only
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) return null;

  // If support is open, show the simple chat bubble
  if (status.isOpen) {
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
        <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background bg-success"
        />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="sr-only">Live chat</span>
      </button>
    );
  }

  // Support is closed - show expandable hours panel
  return (
    <>
      {/* Collapsed state - just the bubble */}
      {!showHours && (
        <button
          type="button"
          data-gesture-exempt="true"
          onClick={() => setShowHours(true)}
          className="fixed z-[9999] h-14 w-14 rounded-full gradient-button shadow-lg touch-manipulation cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
          style={{
            WebkitTapHighlightColor: 'transparent',
            bottom: 'max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
            right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)',
          }}
          aria-label="View support hours"
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background bg-warning"
          />
          <span className="sr-only">Support closed - view hours</span>
        </button>
      )}

      {/* Expanded state - hours panel */}
      {showHours && (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-xl shadow-xl p-4 w-72"
          style={{
            bottom: 'max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
            right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              <span className="text-sm font-medium text-foreground">Support Closed</span>
            </div>
            <button
              onClick={() => setShowHours(false)}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              aria-label="Close hours panel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Hours list */}
          <div className="space-y-1 mb-4">
            <p className="text-xs text-muted-foreground mb-2">Opening Hours</p>
            {DAY_NAMES.map((dayName, index) => {
              const hours = OPENING_HOURS[index];
              const isToday = index === status.currentDay;
              
              return (
                <div
                  key={dayName}
                  className={`flex justify-between text-xs py-1 px-2 rounded ${
                    isToday ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  <span>{dayName}</span>
                  <span>
                    {hours ? `${formatTime(hours.open)} - ${formatTime(hours.close)}` : 'Closed'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Support links */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Need help now?</p>
            <Link
              to="/faq"
              onClick={() => setShowHours(false)}
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors py-1"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Browse FAQ</span>
            </Link>
            <Link
              to="/forum"
              onClick={() => setShowHours(false)}
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors py-1"
            >
              <Users className="h-4 w-4" />
              <span>Community Forum</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
