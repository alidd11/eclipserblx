import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

export function GuestSupportForm() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('guest-support-ticket', {
        body: { email, subject, message },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSubmitted(true);
      toast.success('Support ticket created. We\'ll get back to you via email.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
        <p className="font-medium">Ticket submitted successfully</p>
        <p className="text-sm text-muted-foreground">We'll respond to your email as soon as possible.</p>
        <Button variant="outline" size="sm" onClick={() => { setIsSubmitted(false); setEmail(''); setSubject(''); setMessage(''); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="guest-email">Your Email</Label>
        <Input id="guest-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guest-subject">Subject</Label>
        <Input id="guest-subject" placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="guest-message">Message</Label>
        <Textarea id="guest-message" placeholder="Describe your issue in detail..." value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={5000} rows={4} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full gradient-button border-0">
        {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Ticket'}
      </Button>
    </form>
  );
}
