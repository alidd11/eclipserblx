import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/dateUtils';
import { Conversation, ISSUE_CATEGORY_LABELS, ISSUE_CATEGORY_COLORS } from './ChatConstants';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({
  conversations,
  selectedConversation,
  isLoading,
  onSelect }: ConversationListProps) {
  const activeConversations = conversations.filter(c => c.status !== 'closed');

  return (
    <div className={cn(
      "border border-border rounded-lg bg-card flex flex-col overflow-hidden shrink-0 w-full lg:w-80 xl:w-96 min-h-0",
      selectedConversation ? "hidden lg:flex" : "flex"
    )}>
      <div className="p-2.5 lg:p-4 border-b border-border bg-muted/50 shrink-0">
        <h3 className="font-medium text-sm">Active Conversations</h3>
      </div>
      <div data-gesture-exempt="true" className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : activeConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No active conversations</div>
        ) : (
          <div className="divide-y divide-border">
            {activeConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => conv.status !== 'closed' ? onSelect(conv) : undefined}
                className={cn(
                  'w-full p-3 lg:p-4 text-left hover:bg-muted/50 transition-colors touch-manipulation',
                  selectedConversation?.id === conv.id && 'bg-muted'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium truncate text-sm lg:text-base">
                    {conv.customer_name || 'Anonymous'}
                  </span>
                  <Badge variant={conv.status !== 'closed' ? 'default' : 'secondary'} className="text-[10px] lg:text-xs">
                    {conv.status}
                  </Badge>
                </div>
                {conv.issue_category && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] mb-1",
                      ISSUE_CATEGORY_COLORS[conv.issue_category] || ISSUE_CATEGORY_COLORS.other
                    )}
                  >
                    {ISSUE_CATEGORY_LABELS[conv.issue_category] || conv.issue_category}
                  </Badge>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Circle className={cn('h-2 w-2 fill-current', conv.status !== 'closed' ? 'text-green-500' : 'text-muted-foreground')} />
                  <span>{formatRelative(conv.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
