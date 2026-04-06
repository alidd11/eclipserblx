import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { type JobApplication } from './types';

interface MassMessageDialogProps {
  open: boolean;
  onClose: () => void;
  applications: JobApplication[];
  stats: { pending: number; reviewing: number; accepted: number; rejected: number };
}

export function MassMessageDialog({ open, onClose, applications, stats }: MassMessageDialogProps) {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const filteredApps = statusFilter === 'all' ? applications : applications.filter(a => a.status === statusFilter);

  const mutation = useMutation({
    mutationFn: async ({ applicationIds, subject, message }: { applicationIds: string[]; subject: string; message: string }) => {
      const messages = applicationIds.map(appId => ({
        application_id: appId,
        subject,
        message,
        sent_by: user?.id,
      }));
      const { error } = await supabase.from('applicant_messages').insert(messages);
      if (error) throw error;
      return applicationIds.length;
    },
    onSuccess: (count) => {
      toast.success(`Message sent to ${count} applicant${count > 1 ? 's' : ''}`);
      onClose();
      setSubject('');
      setBody('');
    },
    onError: () => toast.error('Failed to send mass message'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Mass Message
          </DialogTitle>
          <DialogDescription>
            Send a message to multiple applicants at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applicants ({applications.length})</SelectItem>
                <SelectItem value="pending">Pending ({stats.pending})</SelectItem>
                <SelectItem value="reviewing">Reviewing ({stats.reviewing})</SelectItem>
                <SelectItem value="accepted">Accepted ({stats.accepted})</SelectItem>
                <SelectItem value="rejected">Rejected ({stats.rejected})</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {filteredApps.length} applicant{filteredApps.length !== 1 ? 's' : ''} will receive this message
            </p>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Application Status Update" />
          </div>

          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message..." rows={5} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                if (filteredApps.length === 0) { toast.error('No applicants match the selected filter'); return; }
                mutation.mutate({ applicationIds: filteredApps.map(a => a.id), subject, message: body });
              }}
              disabled={mutation.isPending || !subject || !body}
            >
              {mutation.isPending ? 'Sending...' : `Send to ${filteredApps.length} Applicant${filteredApps.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
