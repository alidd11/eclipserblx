import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Send, Inbox, Users, User, Check, 
  CheckCheck, Megaphone, RefreshCw, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface StaffMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    display_name: string | null;
    email: string;
  };
}

interface StaffMember {
  user_id: string;
  display_name: string | null;
  email: string;
  roles: string[];
}

export default function StaffMessages() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<StaffMessage | null>(null);
  const [newMessage, setNewMessage] = useState({
    recipient_id: 'all',
    subject: '',
    message: '',
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ['staff-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StaffMessage[];
    },
  });

  // Fetch staff members for recipient list
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      const userIds = [...new Set(roles.map(r => r.user_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;

      return profiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        roles: roles.filter(r => r.user_id === p.user_id).map(r => r.role),
      })) as StaffMember[];
    },
  });

  // Fetch sender profiles for messages
  const { data: senderProfiles } = useQuery({
    queryKey: ['sender-profiles', messages?.map(m => m.sender_id)],
    queryFn: async () => {
      if (!messages?.length) return {};
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', senderIds);
      
      if (error) throw error;
      
      return Object.fromEntries(
        data.map(p => [p.user_id, { display_name: p.display_name, email: p.email }])
      );
    },
    enabled: !!messages?.length,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipient_id: string | null; subject: string; message: string }) => {
      const { error } = await supabase
        .from('staff_messages')
        .insert([{
          sender_id: user?.id,
          recipient_id: data.recipient_id,
          subject: data.subject,
          message: data.message,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
      toast.success('Message sent');
      setShowComposeDialog(false);
      setNewMessage({ recipient_id: 'all', subject: '', message: '' });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('staff_messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('staff-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['staff-messages'] });
          if (payload.new.recipient_id === user?.id || payload.new.recipient_id === null) {
            toast.info('New message received');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // Handle viewing a message
  const handleViewMessage = (message: StaffMessage) => {
    setSelectedMessage(message);
    if (!message.is_read && (message.recipient_id === user?.id || message.recipient_id === null)) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.subject || !newMessage.message) {
      toast.error('Please fill in subject and message');
      return;
    }
    sendMessageMutation.mutate({
      recipient_id: newMessage.recipient_id === 'all' ? null : newMessage.recipient_id,
      subject: newMessage.subject,
      message: newMessage.message,
    });
  };

  // Filter messages
  const inboxMessages = messages?.filter(
    m => m.recipient_id === user?.id || m.recipient_id === null
  ) || [];
  
  const sentMessages = messages?.filter(m => m.sender_id === user?.id) || [];
  
  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getSenderName = (senderId: string) => {
    const profile = senderProfiles?.[senderId];
    return profile?.display_name || profile?.email || 'Unknown';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Staff Messages
            </h1>
            <p className="text-muted-foreground">Internal messaging for team communication</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Send className="h-4 w-4" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>
                    Send a message to a team member or broadcast to all staff.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select 
                      value={newMessage.recipient_id} 
                      onValueChange={(v) => setNewMessage({ ...newMessage, recipient_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            All Staff (Broadcast)
                          </span>
                        </SelectItem>
                        {staffMembers?.filter(s => s.user_id !== user?.id).map((staff) => (
                          <SelectItem key={staff.user_id} value={staff.user_id}>
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {staff.display_name || staff.email}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                      placeholder="Message subject..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={newMessage.message}
                      onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                      placeholder="Type your message..."
                      rows={5}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowComposeDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending}
                    >
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Message List */}
          <Card className="glass-card md:col-span-1">
            <Tabs defaultValue="inbox">
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inbox" className="gap-2">
                    <Inbox className="h-4 w-4" />
                    Inbox
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="gap-2">
                    <Send className="h-4 w-4" />
                    Sent
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="inbox" className="m-0">
                  <ScrollArea className="h-[500px]">
                    {messagesLoading ? (
                      <p className="text-center text-muted-foreground py-8">Loading...</p>
                    ) : inboxMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No messages</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {inboxMessages.map((msg) => (
                          <button
                            key={msg.id}
                            onClick={() => handleViewMessage(msg)}
                            className={cn(
                              "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                              selectedMessage?.id === msg.id && "bg-muted/50",
                              !msg.is_read && "bg-primary/5"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {msg.recipient_id === null ? (
                                    <Megaphone className="h-4 w-4" />
                                  ) : (
                                    getInitials(
                                      senderProfiles?.[msg.sender_id]?.display_name || null,
                                      senderProfiles?.[msg.sender_id]?.email || ''
                                    )
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={cn(
                                    "text-sm truncate",
                                    !msg.is_read && "font-semibold"
                                  )}>
                                    {getSenderName(msg.sender_id)}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {new Date(msg.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className={cn(
                                  "text-sm truncate",
                                  !msg.is_read ? "font-medium" : "text-muted-foreground"
                                )}>
                                  {msg.subject}
                                </p>
                                {msg.recipient_id === null && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    <Megaphone className="h-3 w-3 mr-1" />
                                    Broadcast
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="sent" className="m-0">
                  <ScrollArea className="h-[500px]">
                    {sentMessages.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No sent messages</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {sentMessages.map((msg) => (
                          <button
                            key={msg.id}
                            onClick={() => setSelectedMessage(msg)}
                            className={cn(
                              "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                              selectedMessage?.id === msg.id && "bg-muted/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {msg.recipient_id === null ? (
                                    <Users className="h-4 w-4" />
                                  ) : (
                                    <User className="h-4 w-4" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm truncate">
                                    To: {msg.recipient_id === null ? 'All Staff' : 
                                      staffMembers?.find(s => s.user_id === msg.recipient_id)?.display_name ||
                                      staffMembers?.find(s => s.user_id === msg.recipient_id)?.email ||
                                      'Staff Member'
                                    }
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {new Date(msg.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {msg.subject}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  {msg.is_read ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <Check className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {msg.is_read ? 'Read' : 'Delivered'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Message Detail */}
          <Card className="glass-card md:col-span-2">
            <CardContent className="pt-6">
              {selectedMessage ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{selectedMessage.subject}</h2>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>From: {getSenderName(selectedMessage.sender_id)}</span>
                        <span>•</span>
                        <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                      </div>
                      {selectedMessage.recipient_id === null && (
                        <Badge variant="outline" className="mt-2">
                          <Megaphone className="h-3 w-3 mr-1" />
                          Broadcast to all staff
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="whitespace-pre-wrap text-foreground">{selectedMessage.message}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                  <p>Select a message to view</p>
                  <p className="text-sm">or compose a new message</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
