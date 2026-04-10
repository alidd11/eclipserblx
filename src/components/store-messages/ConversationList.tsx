import { Store, Loader2 } from 'lucide-react';
import {,  formatRelative } from '@/lib/dateUtils';
import type { StoreConversation } from '@/hooks/useStoreMessages';

interface ConversationListProps {
  conversations: StoreConversation[];
  isLoading: boolean;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, isLoading, onSelect }: ConversationListProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Store className="h-12 w-12 mb-3 opacity-50" />
          <p className="font-medium">No store conversations</p>
          <p className="text-sm mt-1">Contact stores you've purchased from.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
            >
              {conv.store?.logo_url ? (
                <img src={conv.store.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{conv.store?.name || 'Store'}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(conv.last_message_at)}
                  </span>
                </div>
                {conv.subject && (
                  <p className="text-sm text-muted-foreground truncate">{conv.subject}</p>
                )}
              </div>
              {(conv.unread_count || 0) > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                  {conv.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
