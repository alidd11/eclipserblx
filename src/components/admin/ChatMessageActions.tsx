import { useState } from 'react';
import { MoreHorizontal, Trash2, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { hapticTap } from '@/lib/haptics';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉'];

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface ChatMessageActionsProps {
  messageId: string;
  isOwn: boolean;
  canDelete: boolean;
  reactions: ChatReaction[];
  currentUserId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  onDelete: (messageId: string) => void;
  isOwnBubble?: boolean;
}

export function ChatMessageActions({
  messageId,
  isOwn,
  canDelete,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  onDelete,
  isOwnBubble = false,
}: ChatMessageActionsProps) {
  const [isReactionOpen, setIsReactionOpen] = useState(false);

  const handleReactionClick = (emoji: string) => {
    hapticTap();
    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.user_id === currentUserId && r.emoji === emoji
    );

    if (existingReaction) {
      onRemoveReaction(existingReaction.id);
    } else {
      onAddReaction(messageId, emoji);
    }
    setIsReactionOpen(false);
  };

  const handleDelete = () => {
    hapticTap();
    onDelete(messageId);
  };

  // Get unique reactions with counts for display
  const reactionCounts = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, hasOwn: false };
    }
    acc[reaction.emoji].count++;
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].hasOwn = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasOwn: boolean }>);

  return (
    <div className={cn('flex items-center gap-1', isOwn ? 'flex-row-reverse' : '')}>
      {/* Reactions display */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(reactionCounts).map(([emoji, { count, hasOwn }]) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors',
                hasOwn
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-muted-foreground">{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-40">
          {/* Reaction picker */}
          <Popover open={isReactionOpen} onOpenChange={setIsReactionOpen}>
            <PopoverTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsReactionOpen(true);
                }}
                className="cursor-pointer"
              >
                <SmilePlus className="h-4 w-4 mr-2" />
                Add Reaction
              </DropdownMenuItem>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="start" 
              className="w-auto p-2"
              onInteractOutside={() => setIsReactionOpen(false)}
            >
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {REACTION_EMOJIS.map((emoji) => {
                  const hasReacted = reactions.some(
                    (r) => r.user_id === currentUserId && r.emoji === emoji
                  );
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className={cn(
                        'p-2 rounded-md text-lg hover:bg-accent transition-colors',
                        hasReacted && 'bg-primary/20'
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
