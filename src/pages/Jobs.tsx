import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Briefcase, MapPin, Loader2, ChevronDown, Copy, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { MainLayout } from '@/components/layout/MainLayout';
import { jobApplicationSchema } from '@/lib/validationSchemas';
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

function ApplicationForm({ position, onSuccess }: { position: string; onSuccess: (token: string) => void }) {
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

      const { data: inserted, error } = await supabase
        .from('job_applications')
        .insert([{
          position: validatedData.position,
          applicant_name: validatedData.applicant_name,
          applicant_email: validatedData.applicant_email,
          discord_username: validatedData.discord_username || null,
          portfolio_url: validatedData.portfolio_url || null,
          experience: validatedData.experience || null,
          message: validatedData.message,
        }])
        .select('access_token')
        .single();
      
      if (error) {
        if (error.code === '23505') throw new Error('DUPLICATE_EMAIL');
        if (error.code === '42501' || error.message?.includes('check_rate_limit')) throw new Error('RATE_LIMITED');
        throw error;
      }

      const accessToken = inserted?.access_token as string;

      await supabase.rpc('record_rate_limit', {
        p_identifier: validatedData.applicant_email,
        p_action_type: 'job_application'
      });

      supabase.functions.invoke('send-application-confirmation', {
        body: {
          applicant_name: validatedData.applicant_name,
          applicant_email: validatedData.applicant_email,
          position: validatedData.position,
          access_token: accessToken,
        },
      }).catch((emailError) => {
        console.error('Failed to send confirmation email:', emailError);
      });

      return accessToken;
    },
    onSuccess: (accessToken: string) => {
      showSuccessNotification('Application Submitted!', 'Check your email for confirmation');
      clearFormData();
      onSuccess(accessToken);
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

export default function Jobs() {
  usePageMeta({ title: 'Careers — Eclipse', description: 'Join the Eclipse team. View open positions and apply to help build the best Roblox asset marketplace.', canonicalPath: '/jobs' });
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleCopyToken = async () => {
    if (!submittedToken) return;
    await navigator.clipboard.writeText(submittedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
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
            <Link to="/careers/portal">
              <Button variant="outline" size="sm" className="text-xs">
                Check Status
              </Button>
            </Link>
          </div>
        </div>

        {/* Token success banner */}
        {submittedToken && (
          <div className="mb-6 border border-border rounded-xl p-4 bg-muted/30 space-y-3">
            <div>
              <h2 className="font-semibold text-sm">Application submitted</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Save this access code — you'll need it to check your status. It's also in your confirmation email.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background border border-border rounded-lg px-3 py-2.5 select-all break-all">
                {submittedToken}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyToken} className="shrink-0">
                {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Link to="/careers/portal" className="inline-block">
              <Button variant="link" size="sm" className="px-0 text-xs h-auto">
                Go to Applicant Portal →
              </Button>
            </Link>
          </div>
        )}

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
                            onSuccess={(token) => {
                              setOpenDialog(null);
                              setSubmittedToken(token);
                            }} 
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
      </div>
    </MainLayout>
  );
}
