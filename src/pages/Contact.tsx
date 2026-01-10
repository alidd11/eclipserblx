import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SITE_NAME } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Mail,
  MessageCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { contactFormSchema, validateWithSchema, isValidationError } from '@/lib/validationSchemas';
import { supabase } from '@/integrations/supabase/client';

export default function Contact() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input with schema
    const validation = validateWithSchema(contactFormSchema, {
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    });

    if (isValidationError(validation)) {
      toast.error(validation.error);
      return;
    }

    // Validation passed, we can proceed
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: validation.data.name,
          email: validation.data.email,
          subject: validation.data.subject,
          message: validation.data.message,
        });

      if (error) throw error;

      toast.success('Message sent!', {
        description: 'We\'ll get back to you within 24-48 hours.',
      });

      setFormData({ name: '', email: user?.email || '', subject: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Failed to send message', {
        description: 'Please try again or use an alternative contact method.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      detail: 'Available on every page',
      action: () => {
        const chatButton = document.querySelector('[data-chat-widget]');
        if (chatButton instanceof HTMLElement) chatButton.click();
      },
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'Send us an email',
      detail: 'support@ukdrip.store',
      href: 'mailto:support@ukdrip.store',
    },
    {
      icon: Clock,
      title: 'Response Time',
      description: 'We aim to respond within',
      detail: '24-48 hours',
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have a question or need help? We're here for you. Choose your preferred way to get in touch.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-4">
            {contactMethods.map((method, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-4">
                  {method.action ? (
                    <button onClick={method.action} className="w-full text-left">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <method.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{method.title}</h3>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                          <p className="text-sm font-medium text-primary mt-1">{method.detail}</p>
                        </div>
                      </div>
                    </button>
                  ) : method.href ? (
                    <a href={method.href} className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <method.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{method.title}</h3>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                        <p className="text-sm font-medium text-primary mt-1">{method.detail}</p>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <method.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{method.title}</h3>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                        <p className="text-sm font-medium text-primary mt-1">{method.detail}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Discord */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <a
                  href="https://discord.gg/d3Tq4KbNwq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-[#5865F2]/10 shrink-0">
                    <svg
                      className="w-5 h-5 text-[#5865F2]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-1">
                      Discord Community
                      <ExternalLink className="w-3 h-3" />
                    </h3>
                    <p className="text-sm text-muted-foreground">Join for quick support</p>
                    <p className="text-sm font-medium text-[#5865F2] mt-1">discord.gg/d3Tq4KbNwq</p>
                  </div>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us more about your inquiry..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    maxLength={5000}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{formData.message.length}/5000 characters</p>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-button border-0"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Business Info */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>{SITE_NAME} • United Kingdom</p>
          <p className="mt-1">
            For legal matters, please refer to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>,{' '}
            <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, and{' '}
            <a href="/refunds" className="text-primary hover:underline">Refund Policy</a>.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
