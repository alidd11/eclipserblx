import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';

export function ChatWidget() {
  const location = useLocation();
  const { toggleChat, isOpen, unreadCount } = useChatPanel();
  
  // Hide the chat widget on admin pages only
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleChat}
      className="fixed h-14 w-14 rounded-full gradient-button shadow-lg z-[9999] touch-manipulation cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
        right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 0.5rem)',
      }}
      aria-label={isOpen ? "Close live chat" : "Open live chat"}
    >
      <MessageCircle className="h-6 w-6 text-white" />
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
