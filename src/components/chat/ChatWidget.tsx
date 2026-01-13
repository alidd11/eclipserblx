import { useLocation } from 'react-router-dom';
import { MessageCircle, Clock } from 'lucide-react';
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getOpeningStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  const todayHours = OPENING_HOURS[day];
  const isOpen = todayHours ? hour >= todayHours.open && hour < todayHours.close : false;
  
  return { isOpen };
}

function formatTime(h: number) {
  const period = h >= 12 ? 'pm' : 'am';
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}${period}`;
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
      data-gesture-exempt="true"
      onClick={toggleChat}
      className="fixed rounded-xl gradient-button shadow-lg z-[9999] touch-manipulation cursor-pointer flex flex-col items-start gap-2 p-3 active:scale-95 transition-transform"
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
        <span className={`ml-1 h-2 w-2 rounded-full ${status.isOpen ? 'bg-green-400' : 'bg-yellow-400'}`} />
        {unreadCount > 0 && !isOpen && (
          <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      
      <div className="flex flex-col gap-0.5 text-white/80 text-[10px] leading-tight">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Clock className="h-3 w-3" />
          <span className="font-medium">Opening Hours</span>
        </div>
        <span>Mon: {formatTime(9)} - {formatTime(19)}</span>
        <span>Tue: {formatTime(9)} - {formatTime(19)}</span>
        <span>Wed: {formatTime(9)} - {formatTime(19)}</span>
        <span>Thu: {formatTime(9)} - {formatTime(19)}</span>
        <span>Fri: {formatTime(9)} - {formatTime(19)}</span>
        <span>Sat: {formatTime(9)} - {formatTime(19)}</span>
        <span>Sun: Closed</span>
      </div>
    </button>
  );
}
