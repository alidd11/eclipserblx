import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPStaffLayout } from '@/components/ip-staff/IPStaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, Plus, Send, ChevronRight, Clock, ArrowUpRight, ArrowDownLeft, Inbox, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { emailTemplates } from '@/components/ip-staff/EmailTemplates';

interface EmailThread {
  id: string;
  creator_id: string;
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

export default function IPStaffEmails() {
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Compose form state
  const [composeSubject, setComposeSubject] = useState('');
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeType, setComposeType] = useState<string>('general');
  const [composeBody, setComposeBody] = useState('');

  // Reply state
  const [replyBody, setReplyBody] = useState('');

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ['ip-staff-email-threads', filter],
    queryFn: async () => {
      let query = supabase
        .from('ip_email_threads')
        .select('*')
        .order('last_message_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmailThread[];
    },
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ip-staff-email-messages', selectedThread],
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

  // Create thread + send first email
  const composeMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create thread
      const { data: threadResult, error: threadError } = await supabase.functions.invoke('send-ip-shield-email', {
        body: {
          action: 'create_thread',
          subject: composeSubject,
          thread_type: composeType,
          recipient_email: composeRecipient,
          recipient_name: composeRecipientName || null,
        },
      });
      if (threadError) throw threadError;
      if (threadResult?.error) throw new Error(threadResult.error);

      // Step 2: Send email in that thread
      const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-ip-shield-email', {
        body: {
          action: 'send',
          thread_id: threadResult.thread.id,
          subject: composeSubject,
          body_html: composeBody.replace(/\n/g, '<br/>'),
          body_text: composeBody,
          recipient_email: composeRecipient,
          recipient_name: composeRecipientName || null,
        },
      });
      if (sendError) throw sendError;
      if (sendResult?.error) throw new Error(sendResult.error);

      return { thread: threadResult.thread, message: sendResult.message };
    },
    onSuccess: (data) => {
      toast.success('Email sent successfully');
      queryClient.invalidateQueries({ queryKey: ['ip-staff-email-threads'] });
      setShowCompose(false);
      setComposeSubject('');
      setComposeRecipient('');
      setComposeRecipientName('');
      setComposeType('general');
      setComposeBody('');
      setSelectedThread(data.thread.id);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send email'),
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-ip-shield-email', {
        body: {
          action: 'reply',
          thread_id: selectedThread,
          body_html: replyBody.replace(/\n/g, '<br/>'),
          body_text: replyBody,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Reply sent');
      queryClient.invalidateQueries({ queryKey: ['ip-staff-email-messages', selectedThread] });
      queryClient.invalidateQueries({ queryKey: ['ip-staff-email-threads'] });
      setReplyBody('');
      setShowReply(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send reply'),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data, error } = await supabase.functions.invoke('send-ip-shield-email', {
        body: { action: 'update_thread_status', thread_id: selectedThread, status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Thread status updated');
      queryClient.invalidateQueries({ queryKey: ['ip-staff-email-threads'] });
    },
  });

  const threadTypeLabel = (type: string) => {
    switch (type) {
      case 'dmca_takedown': return 'DMCA';
      case 'abuse_complaint': return 'Abuse';
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

  return (
    <IPStaffLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Email Management</h1>
            <p className="text-sm text-muted-foreground">View and send emails on behalf of IP Shield clients</p>
          </div>
          <Button size="sm" onClick={() => setShowCompose(true)}>
            <Plus className="h-4 w-4 mr-1" /> Compose
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'open', 'closed', 'archived'].map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
          {/* Thread List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {threadsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !threads?.length ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No email threads</p>
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
                              {thread.recipient_name || thread.recipient_email}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", threadTypeColor(thread.thread_type))}>
                            {threadTypeLabel(thread.thread_type)}
                          </span>
                          <Badge variant={thread.status === 'open' ? 'default' : 'secondary'} className="text-[10px] h-4">
                            {thread.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(thread.last_message_at), 'dd MMM HH:mm')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message View + Reply */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {!selectedThread ? (
                <div className="h-[60vh] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a thread to view & reply</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-[60vh]">
                  {/* Thread header */}
                  {selectedThreadData && (
                    <div className="border-b border-border p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">{selectedThreadData.subject}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          To: {selectedThreadData.recipient_name || selectedThreadData.recipient_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedThreadData.status === 'open' ? (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => statusMutation.mutate('closed')}>
                            Close
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => statusMutation.mutate('open')}>
                            Reopen
                          </Button>
                        )}
                        <Button size="sm" className="text-xs h-7" onClick={() => setShowReply(true)}>
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages?.map(msg => (
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
                                <span className="text-xs font-medium">{msg.sender_name || msg.sender_email}</span>
                                <span className="text-[10px] text-muted-foreground">→ {msg.recipient_email}</span>
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
                              dangerouslySetInnerHTML={{ __html: msg.body_html }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Inline Reply */}
                  {showReply && (
                    <div className="border-t border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Reply</Label>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowReply(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        placeholder="Type your reply..."
                        className="text-sm min-h-[80px]"
                      />
                      <Button
                        size="sm"
                        onClick={() => replyMutation.mutate()}
                        disabled={!replyBody.trim() || replyMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Recipient Email</Label>
                <Input value={composeRecipient} onChange={e => setComposeRecipient(e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <Label className="text-xs">Recipient Name</Label>
                <Input value={composeRecipientName} onChange={e => setComposeRecipientName(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Subject</Label>
              <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Email subject" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={composeType} onValueChange={setComposeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Correspondence</SelectItem>
                  <SelectItem value="dmca_takedown">DMCA Takedown</SelectItem>
                  <SelectItem value="abuse_complaint">Abuse Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Template Preset</Label>
              <Select
                value=""
                onValueChange={(templateId) => {
                  const template = emailTemplates.find(t => t.id === templateId);
                  if (template) {
                    setComposeSubject(template.subject);
                    setComposeBody(template.body);
                    setComposeType(template.type);
                    toast.success(`Loaded "${template.name}" template`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_header_dmca" disabled className="text-xs font-semibold text-muted-foreground">
                    — DMCA Takedown —
                  </SelectItem>
                  {emailTemplates.filter(t => t.type === 'dmca_takedown').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-orange-500" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="_header_abuse" disabled className="text-xs font-semibold text-muted-foreground">
                    — Abuse Complaints —
                  </SelectItem>
                  {emailTemplates.filter(t => t.type === 'abuse_complaint').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-destructive" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="_header_general" disabled className="text-xs font-semibold text-muted-foreground">
                    — General —
                  </SelectItem>
                  {emailTemplates.filter(t => t.type === 'general').map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-primary" />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write your email or select a template above..."
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompose(false)}>Cancel</Button>
            <Button
              onClick={() => composeMutation.mutate()}
              disabled={!composeRecipient || !composeSubject || !composeBody || composeMutation.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              {composeMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IPStaffLayout>
  );
}
