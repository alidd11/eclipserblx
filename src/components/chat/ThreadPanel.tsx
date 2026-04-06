import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { RichMessageContent } from './RichMessageContent';
import { useChatScroll } from './useChatScroll';
import { useThreadMessages } from './useThreadMessages';
import type { ChatMessage, ChatRoomConfig, UserProfile } from './chatHelpers';

interface ThreadPanelProps {
  config: ChatRoomConfig;
  parentMessage: ChatMessage;
  profiles: Record<string, UserProfile>;
  userRoles: Record<string, string>;
  getRoleBadgeStyle: (role: string) => { label: string; style: React.CSSProperties } | null;
  currentUserId: string;
  onClose: () => void;
}

export function ThreadPanel({
  config,
  parentMessage,
  profiles,
  userRoles,
  getRoleBadgeStyle,
  currentUserId,
  onClose,
}: ThreadPanelProps) {
  const [reply, setReply] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { threadMessages, isLoading, sendThreadReply } = useThreadMessages(config, parentMessage.id);
  const { handleInputFocus, scrollToBottom } = useChatScroll(scrollRef, inputRef);

  const getDisplayName = (userId: string) => {
    const profile = profiles[userId];
    return profile?.display_name || profile?.email?.split('@')[0] || 'Staff';
  };

  const getInitials = (userId: string) => getDisplayName(userId).slice(0, 2).toUpperCase();

  // Auto-scroll on new replies
  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom());
  }, [threadMessages.length, scrollToBottom]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    const text = reply;
    setReply('');
    await sendThreadReply.mutateAsync({ message: text, attachmentUrl: null });
  };

  return (
    <div className="w-full md:w-[380px] min-h-0 border-t border-border md:border-l md:border-t-0 flex flex-col bg-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="text-xs text-muted-foreground">{threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-start gap-2">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {getInitials(parentMessage.user_id)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium">{getDisplayName(parentMessage.user_id)}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(parentMessage.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="text-sm">
              <RichMessageContent message={parentMessage.message} isOwn={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Thread replies */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
        style={{ scrollPaddingBottom: 'calc(var(--chat-safe-bottom, env(safe-area-inset-bottom)) + 5rem)' }}
      >
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-4">Loading thread…</div>
        ) : threadMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No replies yet. Start the thread!
          </div>
        ) : (
          threadMessages.map((msg) => {
            const isOwn = msg.user_id === currentUserId;
            const role = userRoles[msg.user_id];
            const badgeInfo = role ? getRoleBadgeStyle(role) : null;

            return (
              <div key={msg.id} className="flex items-start gap-2">
                <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                    {getInitials(msg.user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium">{getDisplayName(msg.user_id)}</span>
                    {badgeInfo && (
                      <Badge variant="outline" className="text-[9px] py-0 border h-4" style={badgeInfo.style}>
                        {badgeInfo.label}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={cn(
                    'text-sm rounded-lg px-3 py-1.5',
                    isOwn ? 'bg-primary/10' : 'bg-muted/50'
                  )}>
                    <RichMessageContent message={msg.message} isOwn={false} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      <div
        className="flex-shrink-0 border-t border-border bg-card px-3 pt-3 supports-[backdrop-filter]:bg-card/85 supports-[backdrop-filter]:backdrop-blur-xl"
        style={{ paddingBottom: 'max(0.75rem, var(--chat-safe-bottom, env(safe-area-inset-bottom)))' }}
      >
        <div className="flex items-center gap-2 rounded-[1.25rem] border border-border/60 bg-background/70 p-1.5 shadow-sm">
          <Input
            ref={inputRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            onPointerDown={(e) => {
              const input = e.currentTarget;
              if (document.activeElement === input) return;
              try { input.focus({ preventScroll: true }); } catch { input.focus(); }
            }}
            onTouchStart={(e) => {
              const input = e.currentTarget;
              if (document.activeElement === input) return;
              try { input.focus({ preventScroll: true }); } catch { input.focus(); }
            }}
            onFocus={handleInputFocus}
            placeholder="Reply in thread…"
            className="h-10 flex-1 rounded-xl border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
            style={{ fontSize: '16px' }}
          />
          <Button
            onClick={handleSend}
            disabled={!reply.trim() || sendThreadReply.isPending}
            size="icon" aria-label="Loading"
            className="h-10 w-10 flex-shrink-0 rounded-2xl shadow-sm"
          >
            {sendThreadReply.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
