import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errMsg } from '@/lib/errors';

const categories = [
  { value: 'downloads', label: 'Downloads & Products' },
  { value: 'payments', label: 'Payments & Orders' },
  { value: 'account', label: 'Account & Security' },
  { value: 'other', label: 'Other' },
];

const MAX_MESSAGE = 5000;

export function GuestSupportForm() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('guest-support-ticket', {
        body: { email, subject, message, category: category || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSubmitted(true);
      toast.success('Support ticket created. We\'ll get back to you via email.');
    } catch (err) {
      toast.error(errMsg(err) || 'Failed to submit ticket. Please try again.');
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
        <Button variant="outline" size="sm" onClick={() => { setIsSubmitted(false); setEmail(''); setSubject(''); setMessage(''); setCategory(''); }}>
          Submit Another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
        We typically respond within 24 hours.
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-email">Your Email</Label>
        <Input id="guest-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="guest-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest-subject">Subject</Label>
        <Input id="guest-subject" placeholder="Brief description of your issue" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} maxLength={200} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="guest-message">Message</Label>
          <span className={`text-xs ${message.length > MAX_MESSAGE ? 'text-destructive' : 'text-muted-foreground'}`}>
            {message.length}/{MAX_MESSAGE}
          </span>
        </div>
        <Textarea
          id="guest-message"
          placeholder="Describe your issue in detail..."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
          required
          minLength={10}
          maxLength={MAX_MESSAGE}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Ticket'}
      </Button>
    </form>
  );
}
