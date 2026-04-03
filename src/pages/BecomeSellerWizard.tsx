import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerVerification, VerificationResults } from '@/hooks/useSellerVerification';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Store, ArrowRight, ArrowLeft, CheckCircle2, Circle, Loader2,
  Shield, Users, Mail, ShoppingBag, UserCheck, Clock, XCircle,
  Award, Sparkles, ExternalLink, Rocket, PartyPopper, ChevronRight,
  Download, Package
} from 'lucide-react';

const PRODUCT_CATEGORIES = [
  'Scripts & Code',
  'UI Kits & Assets',
  'Game Templates',
  'Plugins & Tools',
  'Graphics & Models',
  'Audio & Music',
  'Other',
];

const STEPS = [
  { id: 'accounts', title: 'Link Accounts', description: 'Connect Discord & Roblox' },
  { id: 'details', title: 'Store Details', description: 'Name & describe your store' },
  { id: 'discord', title: 'Discord Server', description: 'Provide your server invite' },
  { id: 'confirm', title: 'Review & Submit', description: 'Accept terms & apply' },
];

const INITIAL_FORM = {
  storeName: '',
  storeDescription: '',
  productCategory: '',
  discordServerInvite: '',
  ageConfirmed: false,
  termsAccepted: false,
};

export default function BecomeSellerWizard() {
  usePageMeta({
    title: 'Become a Seller',
    description: 'Apply to sell your Roblox creations on Eclipse marketplace.',
    canonicalPath: '/become-seller',
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSeller, hasPendingApplication, application, loading } = useSellerStatus();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [wasAutoApproved, setWasAutoApproved] = useState(false);

  const [formValues, setFormValues, clearFormValues, isDirty] = useFormPersistence('seller-application', INITIAL_FORM);

  const {
    verificationResults,
    settings,
    discordValidating,
    validateDiscordInvite,
    userProfile,
  } = useSellerVerification();

  // Linked accounts query
  const { data: linkedAccounts } = useQuery({
    queryKey: ['user-profile-linked-accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('discord_id, discord_username, roblox_user_id, roblox_username, display_name')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch previous rejected application to pre-fill form
  const { data: previousApplication } = useQuery({
    queryKey: ['previous-seller-application', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('store_applications')
        .select('store_name, store_description, product_category, discord_server_invite')
        .eq('user_id', user.id)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Seller count for social proof
  const { data: sellerCount } = useQuery({
    queryKey: ['active-seller-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .eq('is_active', true);
      return count || 0;
    },
    staleTime: 60 * 60 * 1000,
  });

  const hasDiscord = !!(linkedAccounts?.discord_id && linkedAccounts?.discord_username);
  const hasRoblox = !!(linkedAccounts?.roblox_user_id && linkedAccounts?.roblox_username);
  const bothLinked = hasDiscord && hasRoblox;

  // Auto-advance past step 0 if accounts already linked
  useEffect(() => {
    if (bothLinked && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [bothLinked, currentStep]);

  const handleDiscordBlur = () => {
    if (formValues.discordServerInvite.trim()) {
      validateDiscordInvite(formValues.discordServerInvite);
    }
  };

  // Auto-populate form from previous application or profile data
  useEffect(() => {
    // Don't overwrite if user has already made edits (isDirty)
    if (isDirty) return;

    const updates: Partial<typeof INITIAL_FORM> = {};

    // Store name: previous app → Discord server → Roblox username → display name
    if (!formValues.storeName) {
      if (previousApplication?.store_name) {
        updates.storeName = previousApplication.store_name;
      } else if (verificationResults.discord_server?.guild_name && verificationResults.discord_server?.valid) {
        updates.storeName = verificationResults.discord_server.guild_name;
      } else if (linkedAccounts?.roblox_username) {
        updates.storeName = `${linkedAccounts.roblox_username}'s Store`;
      } else if (linkedAccounts?.display_name) {
        updates.storeName = `${linkedAccounts.display_name}'s Store`;
      }
    }

    // Store description from previous app
    if (!formValues.storeDescription && previousApplication?.store_description) {
      updates.storeDescription = previousApplication.store_description;
    }

    // Product category from previous app
    if (!formValues.productCategory && previousApplication?.product_category) {
      updates.productCategory = previousApplication.product_category;
    }

    // Discord invite from previous app
    if (!formValues.discordServerInvite && previousApplication?.discord_server_invite) {
      updates.discordServerInvite = previousApplication.discord_server_invite;
    }

    if (Object.keys(updates).length > 0) {
      setFormValues(updates);
      // Auto-validate discord invite if pre-filled
      if (updates.discordServerInvite) {
        validateDiscordInvite(updates.discordServerInvite);
      }
    }
  }, [previousApplication, verificationResults.discord_server, linkedAccounts?.roblox_username, linkedAccounts?.display_name]);

  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!formValues.ageConfirmed) throw new Error('You must confirm your age');
      if (!formValues.termsAccepted) throw new Error('You must accept the seller terms');

      if (!verificationResults.discord_server?.valid) {
        throw new Error('Please provide a valid Discord server invite');
      }

      const { data, error } = await supabase.from('store_applications').insert({
        user_id: user.id,
        store_name: formValues.storeName.trim(),
        store_description: formValues.storeDescription.trim() || null,
        product_category: formValues.productCategory || null,
        discord_server_invite: formValues.discordServerInvite.trim(),
        age_confirmed: formValues.ageConfirmed,
        terms_accepted: formValues.termsAccepted,
        terms_accepted_at: new Date().toISOString(),
        verification_results: verificationResults as any,
      }).select('status, auto_approved').single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const autoApproved = data?.auto_approved === true && data?.status === 'approved';
      setWasAutoApproved(autoApproved);
      
      if (autoApproved) {
        toast.success('Store Approved!', { description: 'Your identity was verified automatically.' });
      } else {
        toast.success('Application Submitted!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['seller-application'] });
      queryClient.invalidateQueries({ queryKey: ['seller-status'] });
      clearFormValues();
      setCurrentStep(4); // Show success state
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit application');
    },
  });

  const canProceedStep = (step: number): boolean => {
    switch (step) {
      case 0: return bothLinked;
      case 1: return !!formValues.storeName.trim();
      case 2: return !!(verificationResults.discord_server?.valid && verificationResults.discord_server?.is_permanent);
      case 3: return !!(formValues.ageConfirmed && formValues.termsAccepted && formValues.storeName.trim() && verificationResults.discord_server?.valid);
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitApplication.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Redirect if already seller
  if (!loading && isSeller) {
    return (
      <MainLayout>
        <ResponsiveContainer size="md" className="py-12 px-4">
          <SuccessRedirect type="seller" />
        </ResponsiveContainer>
      </MainLayout>
    );
  }

  // Show pending state
  if (!loading && hasPendingApplication && currentStep !== 4) {
    return (
      <MainLayout>
        <ResponsiveContainer size="md" className="py-12 px-4">
          <PendingApplicationView application={application} />
        </ResponsiveContainer>
      </MainLayout>
    );
  }

  // Post-submit success
  if (currentStep === 4) {
    return (
      <MainLayout>
        <ResponsiveContainer size="md" className="py-12 px-4">
          {wasAutoApproved ? <AutoApprovedView /> : <ApplicationSubmittedView />}
        </ResponsiveContainer>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <ResponsiveContainer size="md" className="py-12 px-4 text-center space-y-4">
          <Store className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Sign in to Apply</h1>
          <p className="text-muted-foreground">You need an account to become a seller on Eclipse.</p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </ResponsiveContainer>
      </MainLayout>
    );
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <MainLayout>
      <ResponsiveContainer size="md" className="py-8 px-4 space-y-6 max-w-2xl">
        {/* Header with social proof */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Become a Seller</h1>
          <p className="text-muted-foreground text-sm">
            Join {sellerCount ? `${sellerCount}+` : 'our'} sellers on Eclipse marketplace
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Most sellers complete this in under 3 minutes</span>
          </div>
          {isDirty && (
            <Badge variant="outline" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Draft saved
            </Badge>
          )}
        </div>

        {/* What to expect timeline */}
        {currentStep === 0 && (
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-xs font-semibold text-foreground mb-3">What to expect</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Rocket className="h-3 w-3 text-primary" />
                </div>
                <span>Apply</span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-3 w-3 text-primary" />
                </div>
                <span>24h review</span>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span>Start earning</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress stepper */}
        <div className="space-y-3">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => i < currentStep && setCurrentStep(i)}
                disabled={i > currentStep}
                className={cn(
                  'flex flex-col items-center gap-1 text-center transition-colors',
                  i <= currentStep ? 'text-foreground' : 'text-muted-foreground/50',
                  i < currentStep && 'cursor-pointer hover:text-primary'
                )}
              >
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors',
                  i < currentStep && 'bg-primary border-primary text-primary-foreground',
                  i === currentStep && 'border-primary text-primary',
                  i > currentStep && 'border-muted text-muted-foreground/50'
                )}>
                  {i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className="text-[10px] sm:text-xs font-medium hidden sm:block">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{STEPS[currentStep].title}</CardTitle>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 0 && (
              <StepAccounts
                hasDiscord={hasDiscord}
                hasRoblox={hasRoblox}
                discordUsername={linkedAccounts?.discord_username}
                robloxUsername={linkedAccounts?.roblox_username}
              />
            )}
            {currentStep === 1 && (
              <StepDetails
                formValues={formValues}
                setFormValues={setFormValues}
              />
            )}
            {currentStep === 2 && (
              <StepDiscord
                formValues={formValues}
                setFormValues={setFormValues}
                onBlur={handleDiscordBlur}
                discordValidating={discordValidating}
                verificationResults={verificationResults}
              />
            )}
            {currentStep === 3 && (
              <StepConfirm
                formValues={formValues}
                setFormValues={setFormValues}
                verificationResults={verificationResults}
                settings={settings}
                linkedAccounts={linkedAccounts}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </div>

          <Button
            onClick={handleNext}
            disabled={!canProceedStep(currentStep) || submitApplication.isPending}
          >
            {submitApplication.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Submitting...
              </>
            ) : currentStep === STEPS.length - 1 ? (
              <>
                Submit Application
                <Rocket className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </ResponsiveContainer>
    </MainLayout>
  );
}

/* ─── Step Components ─── */

function StepAccounts({ hasDiscord, hasRoblox, discordUsername, robloxUsername }: {
  hasDiscord: boolean;
  hasRoblox: boolean;
  discordUsername?: string | null;
  robloxUsername?: string | null;
}) {
  const startDiscordLink = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('discord-auth-url', {
        body: { mode: 'link' },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem('discord_link_redirect', '/become-seller');
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error('Failed to start Discord linking');
    }
  };

  const startRobloxLink = () => {
    sessionStorage.setItem('roblox_link_redirect', '/become-seller');
    window.location.href = '/account?link=roblox';
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        To verify your identity and provide support, we need both accounts linked.
      </p>

      {/* Discord */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        hasDiscord ? 'border-green-500/30 bg-green-500/5' : 'border-border'
      )}>
        <div className="flex items-center gap-3">
          {hasDiscord ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Discord</p>
            <p className="text-xs text-muted-foreground">
              {hasDiscord ? discordUsername : 'Not linked yet'}
            </p>
          </div>
        </div>
        {!hasDiscord && (
          <Button size="sm" variant="outline" onClick={startDiscordLink}>
            Link
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Roblox */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        hasRoblox ? 'border-green-500/30 bg-green-500/5' : 'border-border'
      )}>
        <div className="flex items-center gap-3">
          {hasRoblox ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Roblox</p>
            <p className="text-xs text-muted-foreground">
              {hasRoblox ? robloxUsername : 'Not linked yet'}
            </p>
          </div>
        </div>
        {!hasRoblox && (
          <Button size="sm" variant="outline" onClick={startRobloxLink}>
            Link
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {hasDiscord && hasRoblox && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            Both accounts linked! You're ready to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function StepDetails({ formValues, setFormValues }: {
  formValues: typeof INITIAL_FORM;
  setFormValues: (updates: Partial<typeof INITIAL_FORM>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="storeName">Store Name *</Label>
        <Input
          id="storeName"
          placeholder="My Awesome Store"
          value={formValues.storeName}
          onChange={(e) => setFormValues({ storeName: e.target.value })}
          maxLength={50}
        />
        <p className="text-xs text-muted-foreground">{formValues.storeName.length}/50 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="storeDescription">Store Description</Label>
        <Textarea
          id="storeDescription"
          placeholder="Describe what you'll sell and what makes your store unique..."
          value={formValues.storeDescription}
          onChange={(e) => setFormValues({ storeDescription: e.target.value })}
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="productCategory">Primary Category</Label>
        <Select
          value={formValues.productCategory}
          onValueChange={(v) => setFormValues({ productCategory: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="What will you sell?" />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StepDiscord({ formValues, setFormValues, onBlur, discordValidating, verificationResults }: {
  formValues: typeof INITIAL_FORM;
  setFormValues: (updates: Partial<typeof INITIAL_FORM>) => void;
  onBlur: () => void;
  discordValidating: boolean;
  verificationResults: VerificationResults;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="discordInvite">Discord Server Invite Link *</Label>
        <div className="relative">
          <Input
            id="discordInvite"
            placeholder="https://discord.gg/your-server"
            value={formValues.discordServerInvite}
            onChange={(e) => setFormValues({ discordServerInvite: e.target.value })}
            onBlur={onBlur}
            className={cn(
              verificationResults.discord_server?.valid && 'border-green-500',
              verificationResults.discord_server?.error && 'border-destructive'
            )}
          />
          {discordValidating && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!discordValidating && verificationResults.discord_server?.valid && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">Must be a permanent invite (no expiration).</p>
      </div>

      {/* Server preview */}
      {verificationResults.discord_server?.valid && verificationResults.discord_server?.guild_name && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">{verificationResults.discord_server.guild_name}</span>
          </div>
          {verificationResults.discord_server.member_count && (
            <p className="text-xs text-muted-foreground pl-6">
              {verificationResults.discord_server.member_count.toLocaleString()} members
            </p>
          )}
          {verificationResults.discord_server.is_permanent && (
            <Badge variant="outline" className="text-xs ml-6">Permanent Invite ✓</Badge>
          )}
        </div>
      )}

      {verificationResults.discord_server?.error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {verificationResults.discord_server.error}
        </p>
      )}
    </div>
  );
}

function StepConfirm({ formValues, setFormValues, verificationResults, settings, linkedAccounts }: {
  formValues: typeof INITIAL_FORM;
  setFormValues: (updates: Partial<typeof INITIAL_FORM>) => void;
  verificationResults: VerificationResults;
  settings: any;
  linkedAccounts: any;
}) {
  // Verification status
  const checks = [
    { label: 'Email Verified', passed: verificationResults.email_verified, icon: Mail },
    ...(settings.seller_min_account_age_days > 0 ? [{
      label: `Account Age (${verificationResults.account_age?.days || 0} days)`,
      passed: verificationResults.account_age?.meets_requirement,
      icon: Clock,
    }] : []),
    { label: 'Discord Server Valid', passed: verificationResults.discord_server?.valid, icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <h4 className="font-medium text-sm">Application Summary</h4>
        <div className="grid gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Store Name</span>
            <span className="font-medium">{formValues.storeName}</span>
          </div>
          {formValues.productCategory && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{formValues.productCategory}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discord</span>
            <span>{linkedAccounts?.discord_username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Roblox</span>
            <span>{linkedAccounts?.roblox_username}</span>
          </div>
          {verificationResults.discord_server?.guild_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Server</span>
              <span>{verificationResults.discord_server.guild_name}</span>
            </div>
          )}
          {verificationResults.identity_consistency && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Identity Match</span>
              <Badge variant={verificationResults.identity_consistency.similarity_score >= 80 ? 'default' : 'secondary'} className="text-xs">
                {verificationResults.identity_consistency.similarity_score}%
              </Badge>
            </div>
          )}
        </div>
      </div>

      {verificationResults.identity_consistency && 
       verificationResults.identity_consistency.similarity_score >= 80 &&
       verificationResults.discord_server?.valid &&
       verificationResults.email_verified && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <Sparkles className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            <strong>Instant approval eligible!</strong> Your identity match qualifies you for automatic approval.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification checks */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Verification Status</h4>
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : check.passed === false ? (
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
            )}
            <check.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={check.passed ? 'text-green-600 dark:text-green-400' : ''}>{check.label}</span>
          </div>
        ))}
      </div>

      {/* Group suggestion */}
      {verificationResults.roblox_group && !verificationResults.roblox_group.in_group && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-muted-foreground flex items-start gap-2">
          <Users className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <span><strong className="text-foreground">Tip:</strong> Joining our Roblox group can boost your store's visibility and credibility, but it's not required.</span>
        </div>
      )}

      {/* Terms */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="ageConfirm"
            checked={formValues.ageConfirmed}
            onCheckedChange={(checked) => setFormValues({ ageConfirmed: checked as boolean })}
          />
          <Label htmlFor="ageConfirm" className="text-sm leading-normal cursor-pointer">
            I confirm I am at least 13 years old. I understand that sellers must be 18+ to receive payouts.
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="termsAccept"
            checked={formValues.termsAccepted}
            onCheckedChange={(checked) => setFormValues({ termsAccepted: checked as boolean })}
          />
          <Label htmlFor="termsAccept" className="text-sm leading-normal cursor-pointer">
            I agree to the{' '}
            <Link to="/seller/documents/terms" className="text-primary hover:underline" target="_blank">
              Seller Terms of Service
            </Link>{' '}
            and the 15% platform commission on net sales.
          </Label>
        </div>
      </div>
    </div>
  );
}

/* ─── State Views ─── */

function AutoApprovedView() {
  const setupSteps = [
    { 
      step: 'Identity Verified', 
      desc: 'Discord & Roblox accounts matched', 
      done: true, 
      icon: CheckCircle2,
      action: null,
    },
    { 
      step: 'Store Created', 
      desc: 'Your store is live and ready', 
      done: true, 
      icon: Store,
      action: null,
    },
    { 
      step: 'Connect Payouts', 
      desc: 'Set up Stripe, PayPal, or bank transfer to receive earnings', 
      done: false, 
      icon: Award,
      action: { label: 'Set Up Payouts', href: '/seller/setup' },
    },
    { 
      step: 'Customize Your Store', 
      desc: 'Add your logo, banner, choose a theme, and set accent colors', 
      done: false, 
      icon: Sparkles,
      action: { label: 'Customize', href: '/seller/setup' },
    },
    { 
      step: 'Import Existing Products', 
      desc: 'Already selling on ClearlyDev, BuiltByBit, or Payhip? Import your catalog instantly', 
      done: false, 
      icon: Download,
      action: { label: 'Import Products', href: '/seller/import' },
    },
    { 
      step: 'List Your First Product', 
      desc: 'Or create a new product from scratch and start earning', 
      done: false, 
      icon: Rocket,
      action: { label: 'Add Product', href: '/seller/products/new' },
    },
  ];

  return (
    <div className="text-center space-y-8 py-8">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">You're Approved! 🎉</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your identity was verified automatically. Complete these steps to start selling:
        </p>
      </div>

      {/* Guided setup checklist */}
      <div className="max-w-sm mx-auto space-y-0 text-left">
        {setupSteps.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center',
                item.done ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <item.icon className={cn('h-4 w-4', item.done ? 'text-green-500' : 'text-muted-foreground')} />
              </div>
              {i < setupSteps.length - 1 && <div className="w-px h-full min-h-[2rem] bg-border" />}
            </div>
            <div className="pb-5">
              <p className={cn('text-sm font-medium', item.done && 'text-green-600 dark:text-green-400')}>
                {item.step}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              {item.action && (
                <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
                  <Link to={item.action.href}>
                    {item.action.label}
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild>
          <Link to="/seller/setup">
            Complete Store Setup
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/seller">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function ApplicationSubmittedView() {
  return (
    <div className="text-center space-y-8 py-8">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold">Application Submitted!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          We're reviewing your application. Here's what happens next:
        </p>
      </div>

      {/* Timeline */}
      <div className="max-w-sm mx-auto space-y-0">
        {[
          { step: 'Application Received', desc: 'Your application is in our queue', done: true, icon: CheckCircle2 },
          { step: 'Under Review', desc: 'Our team reviews within 24-48 hours', done: false, icon: Clock },
          { step: 'Decision', desc: "You'll receive a notification", done: false, icon: Mail },
          { step: 'Store Setup', desc: 'Customize your store, import products, and start listing', done: false, icon: Store },
        ].map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center',
                item.done ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <item.icon className={cn('h-4 w-4', item.done ? 'text-green-500' : 'text-muted-foreground')} />
              </div>
              {i < 3 && <div className="w-px h-8 bg-border" />}
            </div>
            <div className="pb-8 text-left">
              <p className={cn('text-sm font-medium', item.done && 'text-green-600 dark:text-green-400')}>
                {item.step}
              </p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline">
          <Link to="/account">Back to Account</Link>
        </Button>
        <Button asChild>
          <Link to="/">
            Browse Marketplace
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function PendingApplicationView({ application }: { application: any }) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Clock className="h-8 w-8 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold">Application Under Review</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Your application for <strong>{application?.store_name}</strong> is being reviewed.
        We typically respond within 24-48 hours.
      </p>
      <p className="text-xs text-muted-foreground">
        Submitted {application?.created_at ? new Date(application.created_at).toLocaleDateString() : ''}
      </p>
      <Button asChild variant="outline">
        <Link to="/account">Back to Account</Link>
      </Button>
    </div>
  );
}

function SuccessRedirect({ type }: { type: string }) {
  return (
    <div className="text-center space-y-4 py-8">
      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
      <h1 className="text-2xl font-bold">You're already a seller!</h1>
      <Button asChild>
        <Link to="/seller">Go to Seller Dashboard</Link>
      </Button>
    </div>
  );
}
