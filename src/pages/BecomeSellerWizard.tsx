import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerVerification } from '@/hooks/useSellerVerification';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
 Store, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
 Clock, Rocket, Sparkles, ChevronRight, Download,
} from 'lucide-react';

import { StepAccounts } from '@/components/seller/wizard/StepAccounts';
import { StepDetails } from '@/components/seller/wizard/StepDetails';
import { StepDiscord } from '@/components/seller/wizard/StepDiscord';
import { StepConfirm } from '@/components/seller/wizard/StepConfirm';
import { AutoApprovedView, ApplicationSubmittedView, PendingApplicationView, SuccessRedirect } from '@/components/seller/wizard/WizardStateViews';

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

 useEffect(() => {
 if (isDirty) return;
 const updates: Partial<typeof INITIAL_FORM> = {};

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
 if (!formValues.storeDescription && previousApplication?.store_description) {
 updates.storeDescription = previousApplication.store_description;
 }
 if (!formValues.productCategory && previousApplication?.product_category) {
 updates.productCategory = previousApplication.product_category;
 }
 if (!formValues.discordServerInvite && previousApplication?.discord_server_invite) {
 updates.discordServerInvite = previousApplication.discord_server_invite;
 }

 if (Object.keys(updates).length > 0) {
 setFormValues(updates);
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
 setCurrentStep(4);
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

 if (!loading && isSeller) {
 return (
 <MainLayout>
 <ResponsiveContainer size="md" className="py-6 md:py-12 px-4">
 <SuccessRedirect />
 </ResponsiveContainer>
 </MainLayout>
 );
 }

 if (!loading && hasPendingApplication && currentStep !== 4) {
 return (
 <MainLayout>
 <ResponsiveContainer size="md" className="py-6 md:py-12 px-4">
 <PendingApplicationView application={application} />
 </ResponsiveContainer>
 </MainLayout>
 );
 }

 if (currentStep === 4) {
 return (
 <MainLayout>
 <ResponsiveContainer size="md" className="py-6 md:py-12 px-4">
 {wasAutoApproved ? <AutoApprovedView /> : <ApplicationSubmittedView />}
 </ResponsiveContainer>
 </MainLayout>
 );
 }

 if (!user) {
 return (
 <MainLayout>
 <ResponsiveContainer size="md" className="py-6 md:py-12 px-4 text-center space-y-4">
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
 <div className="text-center space-y-2">
 <h1 className="text-2xl sm:text-3xl font-bold">Become a Seller</h1>
 <p className="text-muted-foreground text-sm">
 Join {sellerCount ? `${sellerCount}+` : 'our'} sellers on Eclipse marketplace
 </p>
 <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
 <Clock className="h-3 w-3" />
 <span>Most sellers complete this in under 3 minutes</span>
 </div>
 {previousApplication && !isDirty && (
 <Badge variant="outline" className="text-xs">
 <Download className="h-3 w-3 mr-1" />
 Pre-filled from your previous application
 </Badge>
 )}
 {isDirty && (
 <Badge variant="outline" className="text-xs">
 <CheckCircle2 className="h-3 w-3 mr-1" />
 Draft saved
 </Badge>
 )}
 </div>

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

 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-4">
 <h3 className="font-semibold text-sm text-lg">{STEPS[currentStep].title}</h3>
 <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
 </div>
 <div className="p-4 space-y-4">
 {currentStep === 0 && (
 <StepAccounts
 hasDiscord={hasDiscord}
 hasRoblox={hasRoblox}
 discordUsername={linkedAccounts?.discord_username}
 robloxUsername={linkedAccounts?.roblox_username}
 />
 )}
 {currentStep === 1 && (
 <StepDetails formValues={formValues} setFormValues={setFormValues} />
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
 </div>
 </div>

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
