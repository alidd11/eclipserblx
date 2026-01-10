import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Mail, Trash2, Eye, MessageSquare, Search, Filter, CheckCircle, Clock, AlertCircle, Send, Loader2, FileText, User, Reply } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
  notes: string | null;
}

interface ContactMessageReply {
  id: string;
  contact_message_id: string;
  reply_content: string;
  sent_by: string | null;
  sent_at: string;
  sender_type: 'staff' | 'customer';
}

interface EmailTemplate {
  id: string;
  name: string;
  icon: string;
  content: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'thank-you',
    name: 'Thank You',
    icon: '🙏',
    content: `Thank you for reaching out to Eclipse!

We truly appreciate you taking the time to contact us. Your message is important to us, and we're glad you chose to connect.

If you have any other questions or need further assistance, please don't hesitate to reach out again.

Best regards,
The Eclipse Team`,
  },
  {
    id: 'support-info',
    name: 'Support Information',
    icon: '💡',
    content: `Thank you for contacting Eclipse Support!

We've received your inquiry and want to help you as quickly as possible. Here are some helpful resources:

• Visit our FAQ page for common questions: https://eclipserblx.com/faq
• Check our status page for any ongoing issues: https://eclipserblx.com/status
• Browse our product documentation in the Downloads section

If your issue requires further assistance, please reply to this email with additional details about your situation.

Best regards,
The Eclipse Support Team`,
  },
  {
    id: 'order-help',
    name: 'Order Assistance',
    icon: '📦',
    content: `Thank you for reaching out about your order!

We're happy to help with any order-related questions. To assist you better, please ensure you have your order confirmation email handy.

Common order inquiries:
• Download links can be found in your account under "Downloads"
• Bot installation codes are sent to your email after purchase
• Refund requests are handled per our refund policy

If you're experiencing any technical issues with your purchase, please let us know the specific problem and we'll get it resolved right away.

Best regards,
The Eclipse Team`,
  },
  {
    id: 'follow-up',
    name: 'Follow Up',
    icon: '🔄',
    content: `Hi there!

We're following up on your recent inquiry to Eclipse. We hope your question has been resolved.

If you're still experiencing issues or need additional help, please reply to this email and we'll prioritize your request.

Your satisfaction is important to us!

Best regards,
The Eclipse Team`,
  },
  {
    id: 'issue-resolved',
    name: 'Issue Resolved',
    icon: '✅',
    content: `Great news!

We're happy to inform you that the issue you reported has been resolved. You should now be able to proceed without any problems.

If you encounter any further issues or have additional questions, please don't hesitate to reach out.

Thank you for your patience and for being a valued customer!

Best regards,
The Eclipse Team`,
  },
];

export default function ContactMessages() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['contact-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  // Fetch replies for selected message
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['contact-message-replies', selectedMessage?.id],
    queryFn: async () => {
      if (!selectedMessage?.id) return [];
      const { data, error } = await supabase
        .from('contact_message_replies')
        .select('*')
        .eq('contact_message_id', selectedMessage.id)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as ContactMessageReply[];
    },
    enabled: !!selectedMessage?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContactMessage> }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast.success('Message updated');
    },
    onError: () => {
      toast.error('Failed to update message');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      toast.success('Message deleted');
      setDeleteMessage(null);
    },
    onError: () => {
      toast.error('Failed to delete message');
    },
  });

  const handleMarkAsRead = (message: ContactMessage) => {
    if (message.status === 'unread') {
      updateMutation.mutate({ id: message.id, updates: { status: 'read' } });
    }
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateMutation.mutate({ 
      id, 
      updates: { 
        status,
        ...(status === 'responded' ? { responded_at: new Date().toISOString() } : {})
      } 
    });
  };

  const handleSaveNotes = (id: string) => {
    updateMutation.mutate({ id, updates: { notes } });
    toast.success('Notes saved');
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setIsSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          messageId: selectedMessage.id,
          recipientEmail: selectedMessage.email,
          recipientName: selectedMessage.name,
          originalSubject: selectedMessage.subject,
          replyContent: replyContent.trim(),
        },
      });

      if (error) throw error;

      toast.success('Reply sent successfully!', {
        description: `Email sent to ${selectedMessage.email}`,
      });

      // Update local state
      setSelectedMessage({ ...selectedMessage, status: 'responded' });
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-message-replies', selectedMessage.id] });
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Unread</Badge>;
      case 'read':
        return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Read</Badge>;
      case 'responded':
        return <Badge className="gap-1 bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3" />Responded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMessages = messages?.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.email.toLowerCase().includes(search.toLowerCase()) ||
      msg.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: messages?.length || 0,
    unread: messages?.filter(m => m.status === 'unread').length || 0,
    read: messages?.filter(m => m.status === 'read').length || 0,
    responded: messages?.filter(m => m.status === 'responded').length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold">Contact Messages</h1>
          <p className="text-muted-foreground">Manage messages from the contact form</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Unread</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.unread}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Read</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.read}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Responded</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.responded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Messages List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMessages?.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No messages found</h3>
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Contact form submissions will appear here'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages?.map((msg) => (
                        <TableRow 
                          key={msg.id} 
                          className={`cursor-pointer hover:bg-muted/50 ${msg.status === 'unread' ? 'bg-primary/5' : ''}`}
                          onClick={() => {
                            setSelectedMessage(msg);
                            setNotes(msg.notes || '');
                            setReplyContent('');
                            handleMarkAsRead(msg);
                          }}
                        >
                          <TableCell>{getStatusBadge(msg.status)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{msg.name}</p>
                              <p className="text-sm text-muted-foreground">{msg.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{msg.subject}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm whitespace-nowrap">
                              <Clock className="h-3 w-3" />
                              {format(new Date(msg.created_at), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMessage(msg);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-border">
                  {filteredMessages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 cursor-pointer active:bg-muted/50 ${msg.status === 'unread' ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        setSelectedMessage(msg);
                        setNotes(msg.notes || '');
                        setReplyContent('');
                        handleMarkAsRead(msg);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(msg.status)}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(msg.created_at), 'MMM d')}
                            </span>
                          </div>
                          <p className="font-medium truncate">{msg.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{msg.email}</p>
                          <p className="text-sm mt-1 truncate">{msg.subject}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteMessage(msg);
                          }}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* View Message Dialog */}
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMessage?.subject}</DialogTitle>
              <DialogDescription>
                From {selectedMessage?.name} ({selectedMessage?.email})
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="message" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="message">Message</TabsTrigger>
                <TabsTrigger value="reply">Reply</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="message" className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {selectedMessage && format(new Date(selectedMessage.created_at), 'PPpp')}
                  </div>
                  {selectedMessage && getStatusBadge(selectedMessage.status)}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={selectedMessage?.status} 
                    onValueChange={(value) => {
                      if (selectedMessage) {
                        handleUpdateStatus(selectedMessage.id, value);
                        setSelectedMessage({ ...selectedMessage, status: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${selectedMessage?.email}?subject=Re: ${selectedMessage?.subject}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Reply via Email Client
                  </a>
                </Button>
              </TabsContent>
              
              <TabsContent value="reply" className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Replying to:</p>
                  <p className="font-medium">{selectedMessage?.name} &lt;{selectedMessage?.email}&gt;</p>
                  <p className="text-sm text-muted-foreground mt-1">Re: {selectedMessage?.subject}</p>
                </div>

                {/* Reply History */}
                {replies && replies.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Conversation History ({replies.length} {replies.length === 1 ? 'message' : 'messages'})
                    </Label>
                    <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-lg border">
                      {replies.map((reply) => (
                        <div 
                          key={reply.id} 
                          className={`p-3 rounded-lg border ${
                            reply.sender_type === 'customer' 
                              ? 'bg-secondary/30 border-secondary/50 ml-0 mr-8' 
                              : 'bg-primary/5 border-primary/20 ml-8 mr-0'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            {reply.sender_type === 'customer' ? (
                              <>
                                <User className="h-3 w-3" />
                                <span className="font-medium text-foreground">{selectedMessage?.name}</span>
                                <span>replied on {format(new Date(reply.sent_at), 'PPp')}</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                <span className="font-medium text-primary">Staff</span>
                                <span>sent on {format(new Date(reply.sent_at), 'PPp')}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.reply_content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {repliesLoading && (
                  <div className="py-2">
                    <Skeleton className="h-20 w-full" />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Quick Templates
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EMAIL_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 h-auto py-2 px-3"
                        onClick={() => setReplyContent(template.content)}
                      >
                        <span className="text-base">{template.icon}</span>
                        <span className="text-xs truncate">{template.name}</span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select a template to use as a starting point, then customize as needed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Your Reply</Label>
                  <Textarea
                    placeholder="Type your reply here or select a template above..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be sent as a branded email from Eclipse Support
                  </p>
                </div>

                <Button 
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyContent.trim()}
                  className="w-full"
                >
                  {isSendingReply ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    placeholder="Add notes about this message (only visible to staff)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button 
                  onClick={() => selectedMessage && handleSaveNotes(selectedMessage.id)}
                  variant="secondary"
                >
                  Save Notes
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteMessage} onOpenChange={() => setDeleteMessage(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message from {deleteMessage?.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMessage && deleteMutation.mutate(deleteMessage.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}