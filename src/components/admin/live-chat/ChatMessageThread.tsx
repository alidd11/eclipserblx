import { useRef, useEffect, useCallback, useState } from 'react';
import { Send, Paperclip, Loader2, MessageSquare, ArrowLeft, RefreshCw, AlertCircle, Upload, Copy, ShoppingBag, ChevronUp, ChevronDown } from 'lucide-react';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from '@/lib/dateUtils';
import { hapticTap } from '@/lib/haptics';
import { CodeVerificationMessage } from '@/components/chat/CodeVerificationMessage';
import { Conversation, Message, SecureData, CANNED_RESPONSES, ISSUE_CATEGORY_LABELS, ISSUE_CATEGORY_COLORS } from './ChatConstants';

interface ChatMessageThreadProps {
  selectedConversation: Conversation;
  messages: Message[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: (retryTempId?: string) => void;
  onRemoveFailedMessage: (tempId: string) => void;
  onCloseConversation: () => void;
  onBack: () => void;
  customerTyping: boolean;
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTyping: () => void;
  isAdmin: boolean;
  customerProfiles: Record<string, { customer_id: string | null }>;
  customerOrders: Array<{ id: string; total: number; status: string; created_at: string; items: Array<{ product_name: string; price: number }> }>;
  loadingOrders: boolean;
  isChatDragOver: boolean;
  chatDragProps: any;
}

export function ChatMessageThread({
  selectedConversation,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  onRemoveFailedMessage,
  onCloseConversation,
  onBack,
  customerTyping,
  isUploading,
  onFileUpload,
  onTyping,
  isAdmin,
  customerProfiles,
  customerOrders,
  loadingOrders,
  isChatDragOver,
  chatDragProps,
}: ChatMessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const insertCannedResponse = (text: string) => {
    setNewMessage(text);
  };

  return (
    <div
      data-gesture-exempt="true"
      className={cn(
        "border border-border rounded-lg bg-card flex flex-col overflow-hidden flex-1 min-w-0 min-h-0 relative transition-colors",
        "flex",
        isChatDragOver && "border-primary border-2 bg-primary/5"
      )}
      {...chatDragProps}
    >
      {/* Drag overlay */}
      {isChatDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-12 w-12 animate-bounce" />
            <span className="text-lg font-medium">Drop file here</span>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-3 lg:p-4 border-b border-border bg-muted/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" aria-label="Go back" className="lg:hidden shrink-0 h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-sm lg:text-base truncate">
              {selectedConversation.customer_name || 'Anonymous'}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedConversation.user_id && customerProfiles[selectedConversation.user_id]?.customer_id && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] lg:text-xs font-mono shrink-0">
                    {customerProfiles[selectedConversation.user_id].customer_id}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={() => {
                      const customerId = customerProfiles[selectedConversation.user_id!]?.customer_id;
                       if (customerId) {
                        copyToClipboard(customerId, 'Customer ID copied!');
                        hapticTap();
                       }
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {selectedConversation.issue_category && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] lg:text-xs shrink-0",
                    ISSUE_CATEGORY_COLORS[selectedConversation.issue_category] || ISSUE_CATEGORY_COLORS.other
                  )}
                >
                  {ISSUE_CATEGORY_LABELS[selectedConversation.issue_category] || selectedConversation.issue_category}
                </Badge>
              )}
            </div>
            {selectedConversation.customer_email && isAdmin && (
              <p className="text-xs text-muted-foreground truncate">{selectedConversation.customer_email}</p>
            )}
          </div>
        </div>
        {selectedConversation.status !== 'closed' && (
          <Button variant="outline" size="sm" onClick={onCloseConversation} className="shrink-0 text-xs lg:text-sm">Close</Button>
        )}
      </div>

      {/* Order History Collapsible */}
      {selectedConversation.user_id && (
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setShowOrderHistory(!showOrderHistory)}
            className="w-full px-3 lg:px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Order History ({customerOrders.length})</span>
            </div>
            {showOrderHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showOrderHistory && (
            <div className="px-3 lg:px-4 pb-3 space-y-2">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : customerOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No orders found</p>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="bg-muted/50 rounded-md p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">£{order.total.toFixed(2)}</span>
                      <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), 'dd MMM yyyy')}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{order.items.map(i => i.product_name).join(', ')}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        data-gesture-exempt="true"
        className="flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch"
        ref={scrollRef}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div>
          {messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isGrouped = prevMsg && prevMsg.sender_type === msg.sender_type;
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.sender_type === 'agent' ? 'items-end' : 'items-start',
                  isGrouped ? 'mt-0.5' : index > 0 ? 'mt-4' : ''
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">
                    {msg.sender_type === 'agent' ? 'You' : msg.sender_type === 'system' ? 'System' : selectedConversation.customer_name || 'Customer'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">{format(new Date(msg.created_at), 'p')}</span>
                  {msg._status === 'pending' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {msg._status === 'failed' && <AlertCircle className="h-3 w-3 text-destructive" />}
                </div>
                {msg.message_type === 'code_verification' && msg.secure_data ? (
                  <div className="max-w-[85%] lg:max-w-[70%]">
                    <CodeVerificationMessage secureData={msg.secure_data as unknown as SecureData} isStaffView={true} />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[85%] lg:max-w-[70%] rounded-lg px-3 py-2 lg:px-4',
                      msg.sender_type === 'agent' ? 'bg-primary text-primary-foreground' : msg.sender_type === 'system' ? 'bg-muted text-muted-foreground italic text-sm' : 'bg-muted text-foreground',
                      msg._status === 'pending' && 'opacity-70',
                      msg._status === 'failed' && 'bg-destructive/20 border border-destructive/40'
                    )}
                  >
                    {msg.attachment_url && (
                      <div className="mb-2">
                        <AttachmentDisplay url={msg.attachment_url} bucket="chat-attachments" maxImageWidth="100%" maxImageHeight="160px" />
                      </div>
                    )}
                    {!msg.attachment_url && <p className="text-sm lg:text-base">{msg.message}</p>}
                  </div>
                )}
                {msg._status === 'failed' && msg._tempId && (
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => onSendMessage(msg._tempId)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                    <button onClick={() => onRemoveFailedMessage(msg._tempId!)} className="text-[10px] text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {customerTyping && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2 lg:px-4 flex items-center gap-1">
                <span className="text-xs lg:text-sm italic">Customer is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      {selectedConversation.status !== 'closed' && (
        <div className="shrink-0 p-2 lg:p-4 border-t border-border space-y-2 pb-[var(--chat-safe-bottom,8px)] lg:pb-4">
          <input type="file" ref={fileInputRef} onChange={onFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" />
          <div data-gesture-exempt="true" className="flex gap-1 lg:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="icon" aria-label="Message" variant="ghost" title="Canned responses" className="h-9 w-9 lg:h-10 lg:w-10 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                {CANNED_RESPONSES.map((category) => (
                  <div key={category.category}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">{category.category}</DropdownMenuLabel>
                    {category.responses.map((response) => (
                      <DropdownMenuItem key={response.label} onClick={() => insertCannedResponse(response.text)} className="cursor-pointer touch-manipulation">
                        <span className="truncate">{response.label}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              size="icon" aria-label="Loading"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9 w-9 lg:h-10 lg:w-10 shrink-0"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Input
              ref={messageInputRef}
              data-gesture-exempt="true"
              placeholder="Type your reply..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                onTyping();
              }}
              onKeyPress={handleKeyPress}
              onPointerDown={(e) => {
                const input = e.currentTarget;
                if (document.activeElement !== input) input.focus();
              }}
              onTouchStart={(e) => {
                const input = e.currentTarget;
                if (document.activeElement !== input) input.focus();
              }}
              onFocus={() => {
                const keepVisible = () => {
                  scrollToBottom();
                  messageInputRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' });
                };
                requestAnimationFrame(() => {
                  keepVisible();
                  setTimeout(keepVisible, 120);
                  setTimeout(keepVisible, 280);
                  setTimeout(keepVisible, 520);
                });
              }}
              className="text-base"
              style={{ touchAction: 'manipulation', fontSize: '16px' }}
            />
            <Button onClick={() => onSendMessage()} disabled={!newMessage.trim()} className="h-9 lg:h-10 shrink-0 px-3">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
