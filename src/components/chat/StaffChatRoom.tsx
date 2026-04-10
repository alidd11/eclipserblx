import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, AtSign, Plus, X, Image, FileText, Loader2, Upload, Search, Pin, MessageSquare, Check, CheckCheck } from 'lucide-react';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { ChatMessageActions } from '@/components/admin/ChatMessageActions';
import { QuotedMessage } from '@/components/admin/QuotedMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useDropZone } from '@/hooks/useDropZone';
import { markChatAsRead } from '@/hooks/useChatNotifications';
import { cn } from '@/lib/utils';
import {} formatRelative } from '@/lib/dateUtils';
import { toast } from 'sonner';

import type { ChatRoomConfig, ChatMember, ChatMessage } from './chatHelpers';
import { getMentionHandle, renderMessageWithMentions } from './chatHelpers';
import { useChatMessages } from './useChatMessages';
import { useChatPresence } from './useChatPresence';
import { useChatMentions } from './useChatMentions';
import { useChatScroll } from './useChatScroll';
import { usePinnedMessages } from './usePinnedMessages';
import { useMessageSearch } from './useMessageSearch';
import { useReadReceipts } from './useReadReceipts';
import { RichMessageContent } from './RichMessageContent';
import { ThreadPanel } from './ThreadPanel';
import { MessageSearchBar } from './MessageSearchBar';
import { PinnedMessagesBar } from './PinnedMessagesBar';

interface StaffChatRoomProps {
  config: ChatRoomConfig;
  fetchMembers: () => Promise<ChatMember[]>;
  membersQueryKey: string[];
  enabled?: boolean;
}

export function StaffChatRoom({
  config,
  fetchMembers,
  membersQueryKey,
  enabled = true }: StaffChatRoomProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null);
  const [showPinnedList, setShowPinnedList] = useState(false);

  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
  // Note: StaffChatRoom is rendered conditionally and deeply nested,
  // keeping inline check to avoid dependency on mount order.

  // ── Mark as read ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) markChatAsRead(config.readChannel, user.id);
  }, [user, config.readChannel]);

  // ── Core data hook ─────────────────────────────────────────────────────────
  const {
    messages,
    isLoading,
    profiles,
    userRoles,
    currentUserProfile,
    reactions,
    sendMessageMutation,
    deleteMessageMutation,
    addReactionMutation,
    removeReactionMutation,
    uploadFile,
    sendMentionNotifications,
    isUploading,
    setIsUploading,
    getRoleBadgeStyle } = useChatMessages(config, enabled);

  // ── Filter out thread replies from main feed ───────────────────────────────
  const mainMessages = useMemo(() =>
    messages.filter(m => !(m as any).thread_parent_id),
    [messages]
  );

  // ── Thread reply counts ────────────────────────────────────────────────────
  const threadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of messages) {
      const parentId = (m as any).thread_parent_id;
      if (parentId) counts[parentId] = (counts[parentId] || 0) + 1;
    }
    return counts;
  }, [messages]);

  // ── Pinned messages ────────────────────────────────────────────────────────
  const { pinnedMessages, togglePin } = usePinnedMessages(config);

  // ── Search ─────────────────────────────────────────────────────────────────
  const { searchQuery, setSearchQuery, isSearchOpen, toggleSearch, searchResults } = useMessageSearch(mainMessages);

  // ── Read receipts ──────────────────────────────────────────────────────────
  const latestMessageId = mainMessages.length > 0 ? mainMessages[mainMessages.length - 1].id : null;
  const { getLastReadUsers } = useReadReceipts(config.readChannel, latestMessageId);

  // ── Fetch mentionable members ──────────────────────────────────────────────
  const {
    data: allMembers = [],
    isLoading: isMembersLoading,
    error: membersError,
    refetch: refetchMembers } = useQuery({
    queryKey: membersQueryKey,
    queryFn: fetchMembers,
    enabled });

  // ── Mentions ───────────────────────────────────────────────────────────────
  const {
    message: newMessage,
    setMessage: setNewMessage,
    showSuggestions,
    setShowSuggestions,
    selectedIndex: mentionIndex,
    allSuggestions,
    handleInputChange: handleMentionInputChange,
    handleKeyDown: handleMentionKeyDown,
    insertMention } = useChatMentions(allMembers, config.groupMentions, user?.id, inputRef);

  // ── Presence / typing ──────────────────────────────────────────────────────
  const { typingUsers, handleTyping } = useChatPresence(
    `${config.channelPrefix}-presence`,
    currentUserProfile,
    enabled,
  );

  // ── Scroll ─────────────────────────────────────────────────────────────────
  const { scrollToBottom, handleInputFocus } = useChatScroll(scrollRef, inputRef);

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 10MB' });
      return;
    }
    setSelectedFile(file);
  }, []);

  const { isDragOver, dragProps } = useDropZone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: ['image/*', '.pdf', '.doc', '.docx', '.txt', '.zip'],
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    disabled: isUploading });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDisplayName = (userId: string) => {
    const profile = profiles[userId];
    return profile?.display_name || profile?.email?.split('@')[0] || config.fallbackDisplayName;
  };

  const getInitials = (userId: string) => getDisplayName(userId).slice(0, 2).toUpperCase();

  const canDeleteMessage = (messageUserId: string) =>
    config.canDeleteAll || isAdmin || messageUserId === user?.id;

  const messagesMap = useMemo(
    () => Object.fromEntries(messages.map(m => [m.id, m])),
    [messages],
  );

  // ── File select ────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    const messageToSend = newMessage;
    const fileToSend = selectedFile;
    const replyTo = replyToMessage;

    setNewMessage('');
    setSelectedFile(null);
    setReplyToMessage(null);
    setShowSuggestions(false);

    setIsUploading(true);
    try {
      let attachmentUrl: string | null = null;
      if (fileToSend) {
        attachmentUrl = await uploadFile(fileToSend);
        if (!attachmentUrl && !messageToSend.trim()) {
          setIsUploading(false);
          return;
        }
      }

      await sendMessageMutation.mutateAsync({
        message: messageToSend,
        attachmentUrl,
        replyToId: replyTo?.id || null });

      if (messageToSend.trim()) {
        await sendMentionNotifications(messageToSend.trim(), user!.id, allMembers);
      }
    } catch {
      setNewMessage(messageToSend);
      setSelectedFile(fileToSend);
      setReplyToMessage(replyTo);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReply = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage(message);
      inputRef.current?.focus();
    }
  };

  const handleOpenThread = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) setThreadMessage(message);
  };

  const handleNavigateToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary/50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50'), 2000);
    }
  };

  // ── Read receipt indicator for last message ────────────────────────────────
  const readUsers = getLastReadUsers();
  const seenBy = readUsers
    .filter(r => r.last_read_message_id === latestMessageId)
    .map(r => profiles[r.user_id]?.display_name || 'Staff');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ maxHeight: '100%' }}>
      {/* Main chat column */}
      <div
        data-gesture-exempt="true"
        className={cn(
          'relative flex-1 flex flex-col min-h-0 overflow-hidden bg-card transition-colors',
          isDragOver && 'ring-2 ring-primary ring-inset',
        )}
        style={{ overscrollBehavior: 'none' }}
        {...dragProps}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between py-2.5 px-4">
            <div className="flex items-center gap-2">
              <EclipseLogo size="sm" />
              <span className="text-sm font-semibold text-foreground">{config.headerTitle}</span>
              {readUsers.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  <div className="flex -space-x-1">
                    {readUsers.slice(0, 3).map(r => (
                      <div key={r.user_id} className="h-5 w-5 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                        <span className="text-[8px] font-medium text-primary">
                          {(profiles[r.user_id]?.display_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {readUsers.length} online
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Pin" className="h-8 w-8" onClick={() => setShowPinnedList(!showPinnedList)}>
                    <Pin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pinned messages</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Search" className="h-8 w-8" onClick={toggleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search messages</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Search bar */}
        {isSearchOpen && (
          <MessageSearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            onClose={toggleSearch}
            onNavigateToMessage={handleNavigateToMessage}
          />
        )}

        {/* Pinned messages bar */}
        {!showPinnedList && (
          <PinnedMessagesBar
            pinnedMessages={pinnedMessages}
            profiles={profiles}
            onViewPinned={() => setShowPinnedList(true)}
          />
        )}

        {/* Pinned messages list overlay */}
        {showPinnedList && pinnedMessages.length > 0 && (
          <div className="border-b border-border bg-card max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pinned Messages ({pinnedMessages.length})
              </span>
              <Button variant="ghost" size="icon" aria-label="Close" className="h-6 w-6" onClick={() => setShowPinnedList(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            {pinnedMessages.map(pm => (
              <button
                key={pm.id}
                className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                onClick={() => { handleNavigateToMessage(pm.id); setShowPinnedList(false); }}
              >
                <p className="text-xs font-medium">{getDisplayName(pm.user_id)}</p>
                <p className="text-xs text-muted-foreground truncate">{pm.message}</p>
              </button>
            ))}
          </div>
        )}

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-12 w-12 animate-bounce" />
              <span className="text-lg font-medium">Drop file here</span>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div
          data-gesture-exempt="true"
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            scrollPaddingBottom: 'calc(var(--chat-safe-bottom, env(safe-area-inset-bottom)) + 6rem)' }}
        >
          <div className="py-4 flex flex-col">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading messages...</div>
            ) : mainMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              mainMessages.map((message, index) => {
                const isOwn = message.user_id === user?.id;
                const role = userRoles[message.user_id];
                const badgeInfo = role ? getRoleBadgeStyle(role) : null;
                const isPinned = (message as any).is_pinned;
                const replyCount = threadCounts[message.id] || 0;

                const prevMessage = index > 0 ? mainMessages[index - 1] : null;
                const isGrouped =
                  prevMessage &&
                  prevMessage.user_id === message.user_id &&
                  new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() <= 30000;

                return (
                  <div
                    id={`msg-${message.id}`}
                    key={message.id}
                    className={cn(
                      'flex gap-2 sm:gap-3 group min-w-0 max-w-full transition-all rounded-lg',
                      isOwn && 'flex-row-reverse',
                      isGrouped ? 'mt-0.5' : index > 0 ? 'mt-4' : '',
                      isPinned && 'bg-amber-500/5',
                    )}
                  >
                    {isGrouped ? (
                      <div className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0" />
                    ) : (
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                          {getInitials(message.user_id)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn('flex flex-col max-w-[75%] sm:max-w-[70%] min-w-0', isOwn ? 'items-end' : 'items-start')}>
                      {!isGrouped && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap min-w-0 max-w-full">
                          <span className="text-xs sm:text-sm font-medium text-foreground">
                            {getDisplayName(message.user_id)}
                          </span>
                          {badgeInfo && (
                            <Badge variant="outline" className="text-[10px] sm:text-xs py-0 border" style={badgeInfo.style}>
                              {badgeInfo.label}
                            </Badge>
                          )}
                          {isPinned && (
                            <Pin className="h-3 w-3 text-amber-500 rotate-45" />
                          )}
                          <span className="text-[10px] sm:text-xs text-muted-foreground">
                            {formatRelative(message.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Attachment */}
                      {message.attachment_url && (
                        <div className="mb-2 max-w-full min-w-0" onClick={(e) => e.stopPropagation()}>
                          <AttachmentDisplay
                            url={message.attachment_url}
                            bucket={config.storageBucket}
                            maxImageWidth="100%"
                            maxImageHeight="256px"
                          />
                        </div>
                      )}

                      {/* Quoted reply */}
                      {message.reply_to_id && messagesMap[message.reply_to_id] && (
                        <QuotedMessage
                          message={messagesMap[message.reply_to_id].message}
                          senderName={getDisplayName(messagesMap[message.reply_to_id].user_id)}
                          isCompact
                          className="mb-1 max-w-full"
                        />
                      )}

                      {/* Message bubble with rich text */}
                      {message.message && message.message !== '📎 Attachment' && (
                        <div
                          onClick={isPWA ? () => setOpenActionsId(message.id) : undefined}
                          className={cn(
                            'rounded-2xl px-3 py-2 text-sm max-w-full',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md',
                            isPWA && 'cursor-pointer transition-opacity',
                          )}
                        >
                          <RichMessageContent message={message.message} isOwn={isOwn} />
                        </div>
                      )}

                      {/* Thread indicator */}
                      {replyCount > 0 && (
                        <button
                          onClick={() => handleOpenThread(message.id)}
                          className="flex items-center gap-1.5 mt-1 text-xs text-primary hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                        </button>
                      )}

                      <ChatMessageActions
                        messageId={message.id}
                        isOwn={isOwn}
                        canDelete={canDeleteMessage(message.user_id)}
                        reactions={reactions.filter(r => r.message_id === message.id)}
                        currentUserId={user?.id || ''}
                        onAddReaction={(msgId, emoji) => addReactionMutation.mutate({ messageId: msgId, emoji })}
                        onRemoveReaction={(reactionId) => removeReactionMutation.mutate(reactionId)}
                        onDelete={(msgId) => deleteMessageMutation.mutate(msgId)}
                        onReply={handleReply}
                        onThread={() => handleOpenThread(message.id)}
                        onPin={() => togglePin.mutate({ messageId: message.id, isPinned: !!(message as any).is_pinned })}
                        isPWA={isPWA}
                        isOpen={openActionsId === message.id}
                        onOpenChange={(open) => setOpenActionsId(open ? message.id : null)}
                      />
                    </div>
                  </div>
                );
              })
            )}

            {/* Read receipts at bottom */}
            {seenBy.length > 0 && (
              <div className="flex items-center gap-1 mt-2 justify-end">
                <CheckCheck className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">
                  Seen by {seenBy.slice(0, 3).join(', ')}{seenBy.length > 3 ? ` +${seenBy.length - 3}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-3 sm:px-4 py-1 text-xs text-muted-foreground flex-shrink-0">
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0 bg-muted/30">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg min-w-0 overflow-hidden">
              {selectedFile.type.startsWith('image/') ? (
                <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm truncate flex-1 min-w-0">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <Button variant="ghost" size="icon" aria-label="Close" className="h-6 w-6" onClick={() => setSelectedFile(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Reply preview */}
        {replyToMessage && (
          <div className="px-3 sm:px-4 py-2 border-t border-border/50 flex-shrink-0 bg-muted/30">
            <QuotedMessage
              message={replyToMessage.message}
              senderName={getDisplayName(replyToMessage.user_id)}
              onClear={() => setReplyToMessage(null)}
            />
          </div>
        )}

        {/* Input bar */}
        <div
          data-gesture-exempt="true"
          className="relative flex-shrink-0 border-t border-border/70 bg-card px-3 pt-3 sm:px-4 supports-[backdrop-filter]:bg-card/85 supports-[backdrop-filter]:backdrop-blur-xl"
          style={{
            paddingBottom: 'max(0.75rem, var(--chat-safe-bottom, env(safe-area-inset-bottom)))' }}
        >
          {/* Mention suggestions */}
          {showSuggestions && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-[100]">
              {isMembersLoading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading team…</div>
              ) : membersError ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent transition-colors"
                  onClick={() => refetchMembers()}
                >
                  Couldn't load team members. Tap to retry.
                </button>
              ) : allSuggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No matches.</div>
              ) : (
                allSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.type === 'group' ? suggestion.id : suggestion.user_id}
                    className={cn(
                      'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors',
                      index === mentionIndex && 'bg-accent',
                    )}
                    onClick={() => {
                      const name = suggestion.type === 'group'
                        ? suggestion.name!
                        : getMentionHandle(suggestion as ChatMember);
                      insertMention(name);
                    }}
                  >
                    {suggestion.type === 'group' ? (
                      <>
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <AtSign className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">@{suggestion.name}</div>
                          <div className="text-xs text-muted-foreground">{suggestion.description}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {((suggestion as ChatMember).display_name || ((suggestion as ChatMember).email || '').split('@')[0])[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium text-sm">@{getMentionHandle(suggestion as ChatMember)}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {(suggestion as ChatMember).display_name || ((suggestion as ChatMember).email || '').split('@')[0]}
                          </div>
                        </div>
                        {(() => {
                          const r = userRoles[(suggestion as ChatMember).user_id!];
                          const bi = r ? getRoleBadgeStyle(r) : null;
                          return bi ? (
                            <Badge variant="outline" className="ml-auto text-[10px] py-0 border" style={bi.style}>
                              {bi.label}
                            </Badge>
                          ) : null;
                        })()}
                      </>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          />

          {/* Input bar */}
          <div data-gesture-exempt="true" className="flex items-center gap-2 rounded-[1.25rem] border border-border/60 bg-background/70 p-1.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon" aria-label="Add"
              className="h-10 w-10 flex-shrink-0 rounded-2xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="h-5 w-5" />
            </Button>

            <div
              className="flex-1 min-w-0 relative"
              style={{ touchAction: 'manipulation' }}
              data-gesture-exempt="true"
            >
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => handleMentionInputChange(e, handleTyping)}
                onKeyDown={(e) => handleMentionKeyDown(e, handleSend)}
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
                placeholder="Message your team…"
                className="h-10 w-full rounded-xl border-0 bg-transparent pr-2 text-base shadow-none focus-visible:ring-0"
                disabled={isUploading}
                style={{ fontSize: '16px' }}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !selectedFile) || isUploading || sendMessageMutation.isPending}
              size="icon" aria-label="Loading"
              className="h-10 w-10 flex-shrink-0 rounded-2xl shadow-sm"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Thread side panel */}
      {threadMessage && (
        <ThreadPanel
          config={config}
          parentMessage={threadMessage}
          profiles={profiles}
          userRoles={userRoles}
          getRoleBadgeStyle={getRoleBadgeStyle}
          currentUserId={user?.id || ''}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
