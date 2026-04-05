import { Pin, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, UserProfile } from './chatHelpers';

interface PinnedMessagesBarProps {
  pinnedMessages: ChatMessage[];
  profiles: Record<string, UserProfile>;
  onViewPinned: () => void;
}

export function PinnedMessagesBar({ pinnedMessages, profiles, onViewPinned }: PinnedMessagesBarProps) {
  if (pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[0];
  const name = profiles[latest.user_id]?.display_name || 'Staff';

  return (
    <button
      onClick={onViewPinned}
      className={cn(
        'flex items-center gap-2 px-4 py-2 border-b border-border bg-amber-500/5',
        'hover:bg-amber-500/10 transition-colors w-full text-left'
      )}
    >
      <Pin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 rotate-45" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{name}: </span>
        <span className="text-xs text-muted-foreground truncate">{latest.message?.slice(0, 80)}</span>
      </div>
      {pinnedMessages.length > 1 && (
        <span className="text-[10px] text-muted-foreground">{pinnedMessages.length} pins</span>
      )}
      <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
    </button>
  );
}
