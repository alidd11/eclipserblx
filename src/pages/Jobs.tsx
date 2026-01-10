import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, Send, CheckCircle, AlertCircle, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { MainLayout } from '@/components/layout/MainLayout';
import { jobApplicationSchema, emailCheckSchema, validateWithSchema, isValidationError } from '@/lib/validationSchemas';

const jobOpenings = [
  {
    id: 1,
    title: 'Livery Designer',
    type: 'Freelance',
    location: 'Remote',
    description: 'Create high-quality UK emergency service liveries for Roblox vehicles. Experience with Photoshop or similar required.',
    requirements: ['Proficient in Photoshop/GIMP', 'Knowledge of UK emergency services', 'Portfolio of previous work', 'Attention to detail'],
  },
  {
    id: 2,
    title: 'Lua Script Developer',
    type: 'Contract',
    location: 'Remote',
    description: 'Develop and maintain Lua scripts for Roblox roleplay servers. Focus on vehicle systems, MDT, and emergency services functionality.',
    requirements: ['Strong Lua programming skills', 'Experience with Roblox Studio', 'Understanding of FiveM/Roblox RP mechanics', 'Git version control'],
  },
  {
    id: 3,
    title: 'Community Moderator',
    type: 'Volunteer',
    location: 'Remote',
    description: 'Help maintain our Discord community, assist customers with questions, and ensure a positive environment for all members.',
    requirements: ['Active Discord presence', 'Excellent communication skills', 'Previous moderation experience', 'Availability across UK timezone'],
  },
  {
    id: 4,
    title: '3D Vehicle Modeler',
    type: 'Freelance',
    location: 'Remote',
    description: 'Create detailed 3D vehicle models optimized for Roblox. Focus on UK police, ambulance, and fire service vehicles.',
    requirements: ['Blender or Maya proficiency', 'Experience with low-poly modeling', 'Understanding of Roblox import requirements', 'Texture mapping skills'],
  },
];

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
  const [formData, setFormData] = useState<ApplicationFormData>({
    position,
    applicant_name: '',
    applicant_email: '',
    discord_username: '',
    portfolio_url: '',
    experience: '',
    message: '',
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      // Validate input with schema
      const validation = validateWithSchema(jobApplicationSchema, data);
      if (isValidationError(validation)) {
        throw new Error(validation.error);
      }

      const validatedData = validation.data;

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
        if (error.code === '23505') {
          throw new Error('DUPLICATE_EMAIL');
        }
        // Check for rate limit error (RLS policy violation)
        if (error.code === '42501' || error.message?.includes('check_rate_limit')) {
          throw new Error('RATE_LIMITED');
        }
        throw error;
      }

      // Record rate limit entry after successful submission
      await supabase.rpc('record_rate_limit', {
        p_identifier: validatedData.applicant_email,
        p_action_type: 'job_application'
      });

      // Send confirmation email (fire and forget - don't block on this)
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
      onSuccess();
    },
    onError: (error: Error) => {
      if (error.message === 'DUPLICATE_EMAIL') {
        showErrorNotification('Already Applied', 'Only one application per person is allowed');
      } else if (error.message === 'RATE_LIMITED') {
        showErrorNotification('Too Many Applications', 'You can only submit 3 applications per day. Please try again tomorrow.');
      } else {
        showErrorNotification('Submission Failed', error.message || 'Please try again');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.applicant_name}
            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
            placeholder="John Smith"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.applicant_email}
            onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
            placeholder="john@example.com"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discord">Discord Username</Label>
          <Input
            id="discord"
            value={formData.discord_username}
            onChange={(e) => setFormData({ ...formData, discord_username: e.target.value })}
            placeholder="username#1234"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolio">Portfolio URL</Label>
          <Input
            id="portfolio"
            type="url"
            value={formData.portfolio_url}
            onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
            placeholder="https://portfolio.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Relevant Experience</Label>
        <Textarea
          id="experience"
          value={formData.experience}
          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          placeholder="Describe your relevant experience..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Why do you want to join us? *</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Tell us why you'd be a great fit..."
          rows={4}
          maxLength={5000}
          required
        />
        <p className="text-xs text-muted-foreground">{formData.message.length}/5000 characters</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Only one application per person is allowed.
      </p>

      <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? (
          <>Submitting...</>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Application
          </>
        )}
      </Button>
    </form>
  );
}

// Component to check application status and view messages
function ApplicationStatusCheck() {
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [applicationData, setApplicationData] = useState<{
    status: string;
    messages: Array<{ id: string; subject: string; message: string; created_at: string; is_read: boolean }>;
  } | null>(null);

  const checkStatus = async () => {
    // Validate email with schema
    const validation = validateWithSchema(emailCheckSchema, { email });
    if (isValidationError(validation)) {
      showErrorNotification('Invalid Email', validation.error);
      return;
    }

    const validatedEmail = validation.data.email;

    setIsChecking(true);
    try {
      // Find application by email
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

      // Get messages for this application
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

      // Mark messages as read
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
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Check Your Application Status
        </CardTitle>
        <CardDescription>
          Enter your email to view your application status and any messages from our team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={checkStatus} disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Check Status'}
          </Button>
        </div>

        {applicationData && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              {getStatusBadge(applicationData.status)}
            </div>

            {applicationData.messages.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages from our team
                </h4>
                {applicationData.messages.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{msg.subject}</span>
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
      </CardContent>
    </Card>
  );
}

export default function Jobs() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're always looking for talented individuals to join our growing team. 
            Check out our open positions below and apply if you think you'd be a great fit.
          </p>
        </motion.div>

        {/* Application Status Check */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <ApplicationStatusCheck />
        </motion.div>

        {/* Job Listings */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {jobOpenings.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
            >
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{job.description}</p>
                  
                  <div>
                    <h4 className="font-medium mb-2">Requirements:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {job.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  <Dialog open={openDialog === job.title} onOpenChange={(open) => setOpenDialog(open ? job.title : null)}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        Apply Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Apply for {job.title}</DialogTitle>
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
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <h2 className="text-2xl font-bold mb-8">Why Work With Us?</h2>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Flexible Hours</h3>
                <p className="text-sm text-muted-foreground">Work on your own schedule from anywhere in the world.</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-500" />
                <h3 className="font-semibold mb-2">Creative Freedom</h3>
                <p className="text-sm text-muted-foreground">Express your creativity and contribute to exciting projects.</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-blue-500" />
                <h3 className="font-semibold mb-2">Growing Community</h3>
                <p className="text-sm text-muted-foreground">Join a passionate community of creators and developers.</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
