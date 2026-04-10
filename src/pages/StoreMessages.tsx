import { MessageCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { EclipseLogo } from '@/components/ui/EclipseLogo';
import { useStoreMessages } from '@/hooks/useStoreMessages';
import { NewConversationForm } from '@/components/store-messages/NewConversationForm';
import { ConversationView } from '@/components/store-messages/ConversationView';
import { ConversationList } from '@/components/store-messages/ConversationList';

export default function StoreMessages() {
  const sm = useStoreMessages();

  if (!sm.user) return null;

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <EclipseLogo size="sm" />
            <h1 className="text-lg font-semibold">Store Messages</h1>
          </div>
          {!sm.showNewConversation && !sm.selectedConversation && (
            <Button size="sm" onClick={() => sm.setShowNewConversation(true)}>
              <MessageCircle className="h-4 w-4 mr-1.5" />
              New Message
            </Button>
          )}
        </div>

        {sm.showNewConversation && (
          <NewConversationForm
            directStore={sm.directStore}
            purchasedStores={sm.purchasedStores}
            selectedStore={sm.selectedStore}
            setSelectedStore={sm.setSelectedStore}
            selectedOrderId={sm.selectedOrderId}
            setSelectedOrderId={sm.setSelectedOrderId}
            newSubject={sm.newSubject}
            setNewSubject={sm.setNewSubject}
            issueDescription={sm.issueDescription}
            setIssueDescription={sm.setIssueDescription}
            onClose={() => sm.setShowNewConversation(false)}
            onStart={sm.handleStartConversation}
            isPending={sm.createConversationMutation.isPending}
            getStoreProductNames={sm.getStoreProductNames}
          />
        )}

        {sm.selectedConversation && sm.selectedConv && (
          <ConversationView
            conversation={sm.selectedConv}
            messages={sm.messages}
            messagesLoading={sm.messagesLoading}
            scrollRef={sm.scrollRef}
            newMessage={sm.newMessage}
            setNewMessage={sm.setNewMessage}
            onSend={sm.handleSend}
            isSending={sm.sendMessageMutation.isPending}
            onBack={() => {
              sm.setSelectedConversation(null);
              sm.setSearchParams({});
            }}
          />
        )}

        {!sm.showNewConversation && !sm.selectedConversation && (
          <ConversationList
            conversations={sm.conversations}
            isLoading={sm.conversationsLoading}
            onSelect={(id) => {
              sm.setSelectedConversation(id);
              sm.setSearchParams({ conversation: id });
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
