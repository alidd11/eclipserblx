import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Calendar, ExternalLink, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { type JobApplication, type ApplicantMessage, getApplicationStatusBadge } from './types';

interface ApplicationDetailDialogProps {
  application: JobApplication | null;
  onClose: () => void;
}

export function ApplicationDetailDialog({ application, onClose }: ApplicationDetailDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [notes, setNotes] = useState(application?.notes || '');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  const { data: messages } = useQuery({
    queryKey: ['application-messages', application?.id],
    queryFn: async () => {
      if (!application) return [];
      const { data, error } = await supabase
        .from('applicant_messages')
        .select('*')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApplicantMessage[];
    },
    enabled: !!application,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes, sendEmail = true }: { id: string; status: string; notes?: string; sendEmail?: boolean }) => {
      const { error } = await supabase
        .from('job_applications')
        .update({ status, notes: notes || null, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { status, sendEmail };
    },
    onSuccess: async ({ status, sendEmail }) => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      toast.success('Application updated');

      if (sendEmail && application && ['accepted', 'rejected', 'reviewing'].includes(status)) {
        try {
          await supabase.functions.invoke('send-application-status-update', {
            body: {
              applicant_name: application.applicant_name,
              applicant_email: application.applicant_email,
              position: application.position,
              status,
            },
          });
          toast.success(`Status update email sent to ${application.applicant_email}`);
        } catch {
          toast.error('Failed to send status update email');
        }
      }
    },
    onError: () => toast.error('Failed to update application'),
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ applicationId, subject, message }: { applicationId: string; subject: string; message: string }) => {
      const { error } = await supabase
        .from('applicant_messages')
        .insert([{ application_id: applicationId, subject, message, sent_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-messages', application?.id] });
      toast.success('Message sent to applicant');
      setMessageSubject('');
      setMessageBody('');
    },
    onError: () => toast.error('Failed to send message'),
  });

  if (!application) return null;

  return (
    <Dialog open={!!application} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details</DialogTitle>
          <DialogDescription>Review application and send messages to the applicant.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="messages">
              Messages
              {messages && messages.length > 0 && (
                <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {application.applicant_name}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {application.applicant_email}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Position</Label>
                <p className="font-medium">{application.position}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Applied</Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(application.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Status</Label>
                <div>{getApplicationStatusBadge(application.status)}</div>
              </div>
              {application.discord_username && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Discord</Label>
                  <p className="font-medium">{application.discord_username}</p>
                </div>
              )}
              {application.portfolio_url && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Portfolio</Label>
                  <a
                    href={application.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary flex items-center gap-1 hover:underline"
                  >
                    View Portfolio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {application.experience && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">Experience</Label>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{application.experience}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-muted-foreground">Message</Label>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{application.message}</p>
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this application..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Update Status</Label>
              <div className="flex gap-2 flex-wrap">
                {(['pending', 'reviewing', 'accepted', 'rejected', 'closed'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={application.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      updateStatusMutation.mutate({
                        id: application.id,
                        status,
                        notes,
                        sendEmail: status !== 'closed',
                      });
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                "Closed" will not send an email to the applicant.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 mt-4">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-sm">Send Message to Applicant</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Message subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!messageSubject || !messageBody) {
                      toast.error('Please fill in subject and message');
                      return;
                    }
                    sendMessageMutation.mutate({
                      applicationId: application.id,
                      subject: messageSubject,
                      message: messageBody,
                    });
                  }}
                  disabled={sendMessageMutation.isPending || !messageSubject || !messageBody}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message History
              </h4>
              {messages?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No messages sent yet.</p>
              ) : (
                messages?.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{msg.subject}</span>
                      <div className="flex items-center gap-2">
                        {msg.is_read && <Badge variant="outline" className="text-xs">Read</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
