import { Loader2, ArrowLeft, Send, Paperclip, ShieldCheck, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MainLayout } from '@/components/layout/MainLayout';
import { SecureCodeInput } from '@/components/chat/SecureCodeInput';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { useLiveChat, ISSUE_CATEGORIES } from '@/hooks/useLiveChat';

const LiveChatPage = () => {
  const chat = useLiveChat();

  if (chat.authLoading || chat.isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-3xl py-4 sm:py-8">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-40" /></div>
          </div>
          <div className="border rounded-lg bg-card p-6 space-y-4 min-h-[40vh]">
            <div className="flex gap-2"><Skeleton className="h-16 w-2/3 rounded-lg" /></div>
            <div className="flex gap-2 justify-end"><Skeleton className="h-12 w-1/2 rounded-lg" /></div>
            <div className="flex gap-2"><Skeleton className="h-10 w-3/5 rounded-lg" /></div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => chat.navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Live Support</h1>
            <p className="text-sm text-muted-foreground">
              {chat.conversation ? 'Chat with our support team' : 'Start a new conversation'}
            </p>
          </div>
        </div>

        <div className="border rounded-lg bg-card overflow-hidden">
          {!chat.conversation ? (
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">What can we help you with?</Label>
                <Select value={chat.issueCategory} onValueChange={chat.setIssueCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Describe your issue</Label>
                <Textarea
                  id="description"
                  value={chat.issueDescription}
                  onChange={(e) => chat.setIssueDescription(e.target.value)}
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={chat.startConversation}
                disabled={!chat.issueCategory || !chat.issueDescription.trim() || chat.isSending}
                className="w-full"
              >
                {chat.isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting...</> : 'Start Conversation'}
              </Button>
            </div>
          ) : chat.isChatClosed ? (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[40vh]">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h3 className="font-semibold text-xl mb-2">Chat Ended</h3>
              <p className="text-muted-foreground mb-6">Thanks for chatting with us! We hope we were able to help.</p>
              <Button onClick={chat.handleStartNewConversation} size="lg">Start New Chat</Button>
            </div>
          ) : (
            <div className="flex flex-col h-[60vh] sm:h-[70vh]">
              <ChatMessageList
                messages={chat.messages}
                isEscalated={chat.isEscalated}
                isAiResponding={chat.isAiResponding}
                isAgentTyping={chat.isAgentTyping}
                inactivityWarning={chat.inactivityWarning}
              />

              <SecureCodeInput
                open={chat.showSecureInput}
                onOpenChange={chat.setShowSecureInput}
                conversationId={chat.conversation.id}
                onSuccess={chat.handleSecureCodeSuccess}
              />

              <div className="p-4 border-t bg-background">
                <div className="flex items-center gap-2">
                  <input
                    ref={chat.fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={chat.handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button variant="ghost" size="icon" aria-label="Attach file" onClick={() => chat.fileInputRef.current?.click()} disabled={chat.isUploading}>
                    {chat.isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => chat.setShowSecureInput(true)} title="Submit secure code">
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                  <Input
                    value={chat.newMessage}
                    onChange={(e) => { chat.setNewMessage(e.target.value); chat.handleTyping(); }}
                    onKeyDown={chat.handleKeyPress}
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
                    onFocus={() => {
                      requestAnimationFrame(() => {
                        chat.scrollToBottom();
                        setTimeout(chat.scrollToBottom, 150);
                        setTimeout(chat.scrollToBottom, 350);
                      });
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={chat.isSending}
                  />
                  <Button size="icon" aria-label="Send" onClick={chat.sendMessage} disabled={!chat.newMessage.trim() || chat.isSending}>
                    {chat.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default LiveChatPage;
