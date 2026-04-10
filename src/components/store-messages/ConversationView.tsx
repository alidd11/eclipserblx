import { RefObject } from 'react';
import { ArrowLeft, Store, MessageCircle, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { StoreConversation, StoreMessage } from '@/hooks/useStoreMessages';

interface ConversationViewProps {
  conversation: StoreConversation;
  messages: StoreMessage[];
  messagesLoading: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  newMessage: string;
  setNewMessage: (s: string) => void;
  onSend: () => void;
  isSending: boolean;
  onBack: () => void;
}

export function ConversationView({
  conversation,
  messages,
  messagesLoading,
  scrollRef,
  newMessage,
  setNewMessage,
  onSend,
  isSending,
  onBack,
}: ConversationViewProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {conversation.store?.logo_url ? (
          <img src={conversation.store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{conversation.store?.name || 'Store'}</p>
          {conversation.subject && (
            <p className="text-xs text-muted-foreground truncate">{conversation.subject}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-[min(400px,50dvh)] overflow-y-auto p-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.sender_type === 'customer' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2',
                    msg.sender_type === 'customer'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={cn('text-[10px] mt-1', msg.sender_type === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background/50">
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
              className="rounded-full"
            />
          </div>
          <Button size="icon" aria-label="Send" className="rounded-full h-10 w-10" onClick={onSend} disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
