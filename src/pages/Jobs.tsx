import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Briefcase, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { MainLayout } from '@/components/layout/MainLayout';
import { jobApplicationSchema, emailCheckSchema, validateWithSchema, isValidationError } from '@/lib/validationSchemas';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { usePageMeta } from '@/hooks/usePageMeta';

interface JobChannel {
  id: string;
  title: string;
  type: string;
  location: string;
  description: string;
  requirements: string[];
  is_active: boolean;
  display_order: number;
}

interface ApplicationFormData {
  position: string;
  applicant_name: string;
  applicant_email: string;
  discord_username: string;
  portfolio_url: string;
  experience: string;
  message: string;
}

function ApplicationForm({ position, onSuccess }: { position: string; onSuccess: () => void }) {
  const [formData, setFormData, clearFormData] = useFormPersistence<ApplicationFormData>(
    `job-application-${position.replace(/\s+/g, '-').toLowerCase()}`,
    {
      position,
      applicant_name: '',
      applicant_email: '',
      discord_username: '',
      portfolio_url: '',
      experience: '',
      message: '',
    }
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submitMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const result = jobApplicationSchema.safeParse(data);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          const key = err.path[0] as string;
          if (!errors[key]) errors[key] = err.message;
        });
        setFieldErrors(errors);
        throw new Error(Object.values(errors)[0]);
      }
      setFieldErrors({});
      const validatedData = result.data;

      const { error } = await supabase
        .from('job_applications')
        .insert([{
          position: validatedData.position,
          applicant_name: validatedData.applicant_name,
          applicant_email: validatedData.applicant_email,
          discord_username: validatedData.discord_username || null,
          portfolio_url: validatedData.portfolio_url || null,
          experience: validatedData.experience || null,
          message: validatedData.message,
        }]);
      
      if (error) {
        if (error.code === '23505') throw new Error('DUPLICATE_EMAIL');
        if (error.code === '42501' || error.message?.includes('check_rate_limit')) throw new Error('RATE_LIMITED');
        throw error;
      }

      await supabase.rpc('record_rate_limit', {
        p_identifier: validatedData.applicant_email,
        p_action_type: 'job_application'
      });

      supabase.functions.invoke('send-application-confirmation', {
        body: {
          applicant_name: validatedData.applicant_name,
          applicant_email: validatedData.applicant_email,
          position: validatedData.position,
        },
      }).catch((emailError) => {
        console.error('Failed to send confirmation email:', emailError);
      });
    },
    onSuccess: () => {
      showSuccessNotification('Application Submitted!', 'Check your email for confirmation');
      clearFormData();
      onSuccess();
    },
    onError: (error: Error) => {
      if (error.message === 'DUPLICATE_EMAIL') {
        showErrorNotification('Already Applied', 'Only one application per person is allowed');
      } else if (error.message === 'RATE_LIMITED') {
        showErrorNotification('Too Many Applications', 'You can only submit 3 applications per day. Please try again tomorrow.');
      } else if (!Object.keys(fieldErrors).length) {
        showErrorNotification('Submission Failed', error.message || 'Please try again');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const errorClass = (field: string) =>
    fieldErrors[field] ? 'border-destructive focus-visible:ring-destructive' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            value={formData.applicant_name}
            onChange={(e) => { setFormData({ ...formData, applicant_name: e.target.value }); setFieldErrors(prev => { const { applicant_name, ...rest } = prev; return rest; }); }}
            placeholder="John Smith"
            className={errorClass('applicant_name')}
            required
          />
          {fieldErrors.applicant_name && <p className="text-xs text-destructive">{fieldErrors.applicant_name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
          <Input
            id="email"
            type="email"
            value={formData.applicant_email}
            onChange={(e) => { setFormData({ ...formData, applicant_email: e.target.value }); setFieldErrors(prev => { const { applicant_email, ...rest } = prev; return rest; }); }}
            placeholder="john@example.com"
            className={errorClass('applicant_email')}
            required
          />
          {fieldErrors.applicant_email && <p className="text-xs text-destructive">{fieldErrors.applicant_email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="discord">Discord Username</Label>
          <Input
            id="discord"
            value={formData.discord_username}
            onChange={(e) => { setFormData({ ...formData, discord_username: e.target.value }); setFieldErrors(prev => { const { discord_username, ...rest } = prev; return rest; }); }}
            placeholder="username"
            className={errorClass('discord_username')}
          />
          {fieldErrors.discord_username && <p className="text-xs text-destructive">{fieldErrors.discord_username}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portfolio">Portfolio URL</Label>
          <Input
            id="portfolio"
            type="url"
            value={formData.portfolio_url}
            onChange={(e) => { setFormData({ ...formData, portfolio_url: e.target.value }); setFieldErrors(prev => { const { portfolio_url, ...rest } = prev; return rest; }); }}
            placeholder="https://portfolio.com"
            className={errorClass('portfolio_url')}
          />
          {fieldErrors.portfolio_url && <p className="text-xs text-destructive">{fieldErrors.portfolio_url}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="experience">Relevant Experience</Label>
        <Textarea
          id="experience"
          value={formData.experience}
          onChange={(e) => { setFormData({ ...formData, experience: e.target.value }); setFieldErrors(prev => { const { experience, ...rest } = prev; return rest; }); }}
          placeholder="Describe your relevant experience..."
          rows={3}
          className={errorClass('experience')}
        />
        {fieldErrors.experience && <p className="text-xs text-destructive">{fieldErrors.experience}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Why do you want to join us? <span className="text-destructive">*</span></Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => { setFormData({ ...formData, message: e.target.value }); setFieldErrors(prev => { const { message, ...rest } = prev; return rest; }); }}
          placeholder="Tell us why you'd be a great fit..."
          rows={4}
          maxLength={5000}
          className={errorClass('message')}
          required
        />
        <div className="flex justify-between">
          {fieldErrors.message ? <p className="text-xs text-destructive">{fieldErrors.message}</p> : <span />}
          <p className="text-xs text-muted-foreground">{formData.message.length}/5,000</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Only one application per person is allowed.
      </p>

      <Button type="submit" className="w-full h-12" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Application'
        )}
      </Button>
    </form>
  );
}

function ApplicationStatusCheck() {
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [applicationData, setApplicationData] = useState<{
    status: string;
    messages: Array<{ id: string; subject: string; message: string; created_at: string; is_read: boolean }>;
  } | null>(null);

  const checkStatus = async () => {
    const validation = validateWithSchema(emailCheckSchema, { email });
    if (isValidationError(validation)) {
      showErrorNotification('Invalid Email', validation.error);
      return;
    }

    const validatedEmail = validation.data.email;

    setIsChecking(true);
    try {
      const { data: application, error: appError } = await supabase
        .from('job_applications')
        .select('id, status')
        .eq('applicant_email', validatedEmail)
        .maybeSingle();

      if (appError) throw appError;

      if (!application) {
        showErrorNotification('Not Found', 'No application found for this email');
        setApplicationData(null);
        return;
      }

      const { data: messages, error: msgError } = await supabase
        .from('applicant_messages')
        .select('id, subject, message, created_at, is_read')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      setApplicationData({
        status: application.status,
        messages: messages || [],
      });

      if (messages && messages.length > 0) {
        const unreadIds = messages.filter(m => !m.is_read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('applicant_messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      showErrorNotification('Check Failed', 'Could not verify application status');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">Pending Review</Badge>;
      case 'reviewing':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">Under Review</Badge>;
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Not Selected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="font-semibold text-sm">Check Application Status</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enter your email to view your status and messages from our team.
        </p>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={checkStatus} disabled={isChecking} className="h-12">
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
          </Button>
        </div>

        {applicationData && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(applicationData.status)}
            </div>

            {applicationData.messages.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Messages from our team</h3>
                {applicationData.messages.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{msg.subject}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet. We'll reach out if we need more information.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Jobs() {
  usePageMeta({ title: 'Careers — Eclipse', description: 'Join the Eclipse team. View open positions and apply to help build the best Roblox asset marketplace.', canonicalPath: '/jobs' });
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data: jobOpenings = [], isLoading } = useQuery({
    queryKey: ['job-channels-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_channels')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as JobChannel[];
    },
  });

  const jobTypes = [...new Set(jobOpenings.map(j => j.type))];
  const filteredJobs = typeFilter ? jobOpenings.filter(j => j.type === typeFilter) : jobOpenings;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">Careers</h1>
            {!isLoading && jobOpenings.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {jobOpenings.length} open {jobOpenings.length === 1 ? 'role' : 'roles'}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            We're building the leading marketplace for Roblox creators. Join us.
          </p>
        </div>

        {/* Type filter */}
        {jobTypes.length > 1 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setTypeFilter(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                !typeFilter
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              All
            </button>
            {jobTypes.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                  typeFilter === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Job Listings */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="border border-border rounded-xl p-8 text-center">
            <p className="font-medium text-sm">{typeFilter ? 'No positions match this filter' : 'No open positions at the moment'}</p>
            <p className="text-sm text-muted-foreground mt-1">{typeFilter ? 'Try selecting a different category.' : 'Check back soon for new opportunities.'}</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {filteredJobs.map((job) => {
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id}>
                  {/* Job row */}
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <h2 className="font-semibold text-sm">{job.title}</h2>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/10">
                      <div className="pt-3">
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                      </div>
                      
                      {job.requirements.length > 0 && (
                        <div>
                          <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">Requirements</h3>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {job.requirements.map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Dialog open={openDialog === job.title} onOpenChange={(open) => setOpenDialog(open ? job.title : null)}>
                        <DialogTrigger asChild>
                          <Button className="h-12 w-full sm:w-auto">Apply for this role</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Apply — {job.title}</DialogTitle>
                            <DialogDescription>
                              Fill out the form below to submit your application. We'll review it and get back to you.
                            </DialogDescription>
                          </DialogHeader>
                          <ApplicationForm 
                            position={job.title} 
                            onSuccess={() => setOpenDialog(null)} 
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Application Status Check */}
        <div className="mt-10">
          <ApplicationStatusCheck />
        </div>
      </div>
    </MainLayout>
  );
}
