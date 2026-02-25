import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

interface IPShieldContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IPShieldContactDialog({ open, onOpenChange }: IPShieldContactDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: user?.email || '',
    subject: 'Custom IP Shield Plan',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('ip-shield-contact', {
        body: form,
      });
      if (error) throw error;
      toast({ title: 'Message sent!', description: 'Our IP Shield team will get back to you soon.' });
      onOpenChange(false);
      setForm({ name: '', email: user?.email || '', subject: 'Custom IP Shield Plan', message: '' });
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact IP Shield Team</DialogTitle>
          <DialogDescription>Send us a message and we'll get back to you as soon as possible.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's this about?" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what you need..." rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send Message</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
