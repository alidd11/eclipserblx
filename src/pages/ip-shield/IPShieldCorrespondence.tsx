import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, ChevronRight, Clock, ArrowUpRight, ArrowDownLeft, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmailThread {
  id: string;
  subject: string;
  thread_type: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface EmailMessage {
  id: string;
  thread_id: string;
  sender_email: string;
  sender_name: string | null;
  recipient_email: string;
  direction: string;
  subject: string;
  body_html: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export default function IPShieldCorrespondence() {
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['ip-email-threads', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_email_threads')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data as EmailThread[];
    },
    enabled: !!user,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ip-email-messages', selectedThread],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_email_messages')
        .select('*')
        .eq('thread_id', selectedThread!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as EmailMessage[];
    },
    enabled: !!selectedThread,
  });

  const selectedThreadData = threads?.find(t => t.id === selectedThread);

  const threadTypeLabel = (type: string) => {
    switch (type) {
      case 'dmca_takedown': return 'DMCA Takedown';
      case 'abuse_complaint': return 'Abuse Complaint';
      default: return 'General';
    }
  };

  const threadTypeColor = (type: string) => {
    switch (type) {
      case 'dmca_takedown': return 'text-orange-500 bg-orange-500/10';
      case 'abuse_complaint': return 'text-red-500 bg-red-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'default';
      case 'closed': return 'secondary';
      case 'archived': return 'outline';
      default: return 'default';
    }
  };

  return (
    <IPShieldLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Correspondence</h1>
          <p className="text-sm text-muted-foreground">View emails sent on your behalf by IP Shield</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
          {/* Thread List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Email Threads
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[55vh]">
                {threadsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !threads?.length ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No correspondence yet</p>
                    <p className="text-xs mt-1">Emails from takedowns and complaints will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {threads.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => setSelectedThread(thread.id)}
                        className={cn(
                          "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                          selectedThread === thread.id && "bg-muted/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{thread.subject}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              To: {thread.recipient_name || thread.recipient_email}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", threadTypeColor(thread.thread_type))}>
                            {threadTypeLabel(thread.thread_type)}
                          </span>
                          <Badge variant={statusColor(thread.status) as any} className="text-[10px] h-4">
                            {thread.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(thread.last_message_at), 'dd MMM')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message View */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {!selectedThread ? (
                <div className="h-[60vh] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a thread to view messages</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-[60vh]">
                  {/* Thread header */}
                  {selectedThreadData && (
                    <div className="border-b border-border p-4">
                      <h3 className="font-medium text-sm">{selectedThreadData.subject}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        To: {selectedThreadData.recipient_name || selectedThreadData.recipient_email}
                      </p>
                    </div>
                  )}

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                      </div>
                    ) : !messages?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No messages in this thread</p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map(msg => (
                          <div key={msg.id} className={cn(
                            "rounded-lg border p-4",
                            msg.direction === 'outbound' ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                          )}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {msg.direction === 'outbound' ? (
                                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ArrowDownLeft className="h-3.5 w-3.5 text-green-500" />
                                )}
                                <span className="text-xs font-medium">
                                  {msg.sender_name || msg.sender_email}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  → {msg.recipient_email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={msg.status === 'sent' || msg.status === 'delivered' ? 'default' : 'destructive'} className="text-[10px] h-4">
                                  {msg.status}
                                </Badge>
                                {msg.sent_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(msg.sent_at), 'dd MMM yyyy HH:mm')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div 
                              className="text-sm prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body_html) }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </IPShieldLayout>
  );
}
