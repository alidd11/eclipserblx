import { useLocation } from 'react-router-dom';
import { MessageCircle, Clock } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';

// Opening hours configuration
const OPENING_HOURS = {
  weekday: { open: 9, close: 21 }, // 9 AM - 9 PM
  weekend: { open: 10, close: 18 }, // 10 AM - 6 PM
};

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();
  
  const isWeekend = day === 0 || day === 6;
  const hours = isWeekend ? OPENING_HOURS.weekend : OPENING_HOURS.weekday;
  const isOpen = hour >= hours.open && hour < hours.close;
  
  const formatTime = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}${period}`;
  };
  
  return {
    isOpen,
    openTime: formatTime(hours.open),
    closeTime: formatTime(hours.close),
    isWeekend,
  };
}

export function ChatWidget() {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  const status = getOpeningStatus();
  
  // Hide the chat widget on admin pages only
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleChat}
      className="fixed rounded-xl gradient-button shadow-lg z-[9999] touch-manipulation cursor-pointer flex flex-col items-start gap-1 p-3 active:scale-95 transition-transform"
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        bottom: 'max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
        right: 'max(1rem, env(safe-area-inset-right, 0px) + 0.5rem)',
      }}
      aria-label={isOpen ? "Close live chat" : "Open live chat"}
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-white" />
        <span className="text-white font-medium text-sm">Live Chat</span>
        {unreadCount > 0 && !isOpen && (
          <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-white/80 text-xs">
        <Clock className="h-3 w-3" />
        <span>
          {status.isOpen ? (
            <>Open until {status.closeTime}</>
          ) : (
            <>Opens at {status.openTime}</>
          )}
        </span>
        <span className={`ml-1 h-2 w-2 rounded-full ${status.isOpen ? 'bg-green-400' : 'bg-yellow-400'}`} />
      </div>
    </button>
  );
}
