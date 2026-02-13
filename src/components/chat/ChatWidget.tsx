import { useLocation, Link } from 'react-router-dom';
 import { MessageCircle, HelpCircle, Ticket, X } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';
import { useState, forwardRef } from 'react';

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

export const ChatWidget = forwardRef<HTMLButtonElement>(function ChatWidget(_props, _ref) {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  const status = getOpeningStatus();
  const [showInfo, setShowInfo] = useState(false);

  // Hide the chat widget on admin pages only
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) return null;

  // Always show chat bubble - AI is available 24/7
  return (
    <>
      {/* Main chat bubble - always clickable */}
      {!showInfo && (
        <button
          type="button"
          data-gesture-exempt="true"
          onClick={toggleChat}
          className="fixed z-[9999] h-14 w-14 rounded-full gradient-button shadow-lg touch-manipulation cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
          style={{
            WebkitTapHighlightColor: 'transparent',
            bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 1rem)',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 1rem)',
          }}
          aria-label={isOpen ? 'Close chat' : 'Open chat'}
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          {/* Status indicator - green for human+AI, blue for AI-only */}
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
      )}

      {/* Info button - shows when user long-presses or wants to see hours */}
      {!showInfo && (
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="fixed z-[9998] h-6 w-6 rounded-full bg-muted shadow-sm touch-manipulation cursor-pointer flex items-center justify-center hover:bg-muted transition-colors"
          style={{
            bottom: 'max(4.5rem, env(safe-area-inset-bottom, 0px) + 4rem)',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 1rem)',
          }}
          aria-label="View support info"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {/* Info panel - shows availability details */}
      {showInfo && (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-lg shadow-lg p-4 w-72"
          style={{
            bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 1rem)',
            right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 1rem)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status.isOpen ? 'bg-success' : 'bg-primary'} animate-pulse`} />
              <span className="text-sm font-medium text-foreground">
                {status.isOpen ? 'Live Support Available' : 'AI Support Active'}
              </span>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              aria-label="Close info panel"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* AI availability notice */}
          <div className="bg-muted border border-border rounded-lg p-3 mb-3">
            <p className="text-xs text-foreground font-medium">🤖 AI Support Available 24/7</p>
            <p className="text-xs text-muted-foreground mt-1">
              Get instant help anytime. Complex issues will be queued for our team.
            </p>
          </div>

          {/* Human hours list */}
          <div className="space-y-1 mb-4">
            <p className="text-xs text-muted-foreground mb-2">Human Support Hours</p>
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

          {/* Action buttons */}
          <div className="border-t border-border pt-3 space-y-2">
            <button
              onClick={() => {
                setShowInfo(false);
                toggleChat();
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-2 px-4 rounded-lg"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Start Chat</span>
            </button>
            <div className="flex gap-2">
              <Link
                to="/faq"
                onClick={() => setShowInfo(false)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>FAQ</span>
              </Link>
              <Link
               to="/support/tickets"
                onClick={() => setShowInfo(false)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
               <Ticket className="h-3.5 w-3.5" />
               <span>My Tickets</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
