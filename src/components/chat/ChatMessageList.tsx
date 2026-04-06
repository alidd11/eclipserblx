import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, AlertCircle } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { parseMessageWithLinks } from '@/lib/chatLinks';
import { AttachmentDisplay } from '@/components/chat/AttachmentDisplay';
import { CodeVerificationMessage } from './CodeVerificationMessage';

interface SecureData {
  verified: boolean;
  masked_code: string;
  product_name?: string;
  code_id?: string;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  created_at: string;
  attachment_url?: string | null;
  message_type?: string | null;
  secure_data?: SecureData | null;
}

interface ChatMessageListProps {
  messages: Message[];
  isEscalated: boolean;
  isAiResponding: boolean;
  isAgentTyping: boolean;
  inactivityWarning: boolean;
}

export function ChatMessageList({ messages, isEscalated, isAiResponding, isAgentTyping, inactivityWarning }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiResponding, isAgentTyping]);

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-3">
        {/* AI/Human Support Notice */}
        {!isEscalated && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-primary/5 rounded-lg border border-primary/10">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">You're chatting with Eclipse AI Support</span>
          </div>
        )}
        {isEscalated && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <User className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-muted-foreground">Connected to human support</span>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                msg.sender_type === 'customer'
                  ? 'bg-primary text-primary-foreground'
                  : msg.message_type === 'ai_response'
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted'
              )}
            >
              {msg.sender_type === 'agent' && msg.message_type === 'ai_response' && (
                <div className="flex items-center gap-1 mb-1">
                  <Bot className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-primary font-medium">AI Support</span>
                </div>
              )}
              {msg.message_type === 'code_verification' && msg.secure_data ? (
                <CodeVerificationMessage secureData={msg.secure_data} isStaffView={false} />
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{parseMessageWithLinks(msg.message, msg.sender_type === 'customer')}</p>
                  {msg.attachment_url && (
                    <AttachmentDisplay url={msg.attachment_url} bucket="chat-attachments" className="mt-1" />
                  )}
                </>
              )}
              <span className="text-xs opacity-60 mt-1 block">
                {format(new Date(msg.created_at), 'HH:mm')}
              </span>
            </div>
          </div>
        ))}

        {isAiResponding && (
          <div className="flex justify-start">
            <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Bot className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-xs text-primary">AI is typing</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {isAgentTyping && !isAiResponding && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {inactivityWarning && (
          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-600">Chat will close in 2 minutes due to inactivity</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
