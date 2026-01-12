import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChatPanel } from '@/hooks/useChatPanel';

export function ChatWidget() {
  const location = useLocation();
  const { openChat, isOpen } = useChatPanel();
  
  // Hide the chat widget on admin pages or when the side panel is open
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Don't render on admin routes or when chat panel is open
  if (isAdminRoute || isOpen) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={openChat}
      className="fixed h-14 w-14 rounded-full gradient-button shadow-lg z-[9999] touch-manipulation cursor-pointer flex items-center justify-center active:scale-95 transition-transform"
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        bottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px) + 0.5rem)',
        right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 0.5rem)',
      }}
      aria-label="Open live chat"
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </button>
  );
}
