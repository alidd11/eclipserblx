import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Shield, Plus, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Send, Eye, LogIn, UserCheck, Loader2, ExternalLink,
  CreditCard, Crown, Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { IPShieldContactDialog } from '@/components/ip-shield/IPShieldContactDialog';
import { useIPShieldSubscription } from '@/hooks/useIPShieldSubscription';
import { IP_SHIELD_TIERS, TierCard, CustomPlanCard } from '@/components/ip-shield/IPShieldPricingSection';

// ─── Constants ───

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: Clock },
  reviewing: { label: 'Under Review', variant: 'default', icon: Eye },
  notice_sent: { label: 'Notice Sent', variant: 'default', icon: Send },
  resolved: { label: 'Resolved', variant: 'secondary', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  counter_notice: { label: 'Counter-Notice', variant: 'outline', icon: AlertTriangle },
};

const PLATFORM_LABELS: Record<string, string> = {
  roblox: 'Roblox', discord: 'Discord', youtube: 'YouTube',
  tiktok: 'TikTok', other_marketplace: 'Other Marketplace', other: 'Other',
};

const TYPE_LABELS: Record<string, string> = {
  copyright: 'Copyright Infringement', trademark: 'Trademark Violation',
  stolen_asset: 'Stolen Asset', unauthorized_resale: 'Unauthorized Resale', other: 'Other',
};

// ─── MAIN COMPONENT ───
export default function IPShield() {
  const { user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');

  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [recheckingCaseId, setRecheckingCaseId] = useState<string | null>(null);
  const [recheckResults, setRecheckResults] = useState<{ caseNumber: string; findings: any[]; totalCreations: number } | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'Custom IP Shield Plan', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const { data: subscriptionStatus, isLoading: subLoading, refetch: refetchSubscription } = useIPShieldSubscription();
  const isSubscribed = isStaff || subscriptionStatus?.subscribed === true;

  const { data: verificationStatus, isLoading: verifyLoading, refetch: refetchVerification } = useIdentityVerification(
    !!user && !isStaff && isSubscribed
  );
  const isVerified = isStaff || verificationStatus?.verified === true;

  useEffect(() => {
    if (searchParams.get('verification') === 'complete' && user) refetchVerification();
    if (searchParams.get('subscription') === 'success' && user) refetchSubscription();
  }, [searchParams, user, refetchVerification, refetchSubscription]);

  const startVerification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-identity-verification');
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (error) => {
      toast.error('Verification failed', { description: error.message });
      setVerifying(false);
    },
  });

  const startCheckout = useMutation({
    mutationFn: async (tier: string) => {
      const { data, error } = await supabase.functions.invoke('create-subscription', { body: { product_type: 'ip_shield', tier } });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (error) => {
      toast.error('Checkout failed', { description: error.message });
      setSubscribing(false);
    },
  });

  const { data: userStore } = useQuery({
    queryKey: ['ip-shield-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id').eq('owner_id', user!.id).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  // Form state
  const [form, setForm] = useState({
    infringement_type: '' as string,
    target_platform: '' as string,
    target_platform_other: '',
    infringing_url: '',
    original_work_url: '',
    original_work_description: '',
    evidence_notes: '',
    good_faith_statement: false,
    accuracy_statement: false,
    ownership_confirmed: false,
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['takedown-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('takedown_requests').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  const { data: ipRegistry, isLoading: registryLoading } = useQuery({
    queryKey: ['ip-registry', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('creator_ip_registry').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('takedown_requests').insert({
        creator_id: user!.id,
        store_id: userStore?.id || null,
        case_number: '',
        infringement_type: form.infringement_type,
        target_platform: form.target_platform,
        target_platform_other: form.target_platform === 'other' ? form.target_platform_other : null,
        infringing_url: form.infringing_url,
        original_work_url: form.original_work_url || null,
        original_work_description: form.original_work_description,
        evidence_notes: form.evidence_notes || null,
        good_faith_statement: form.good_faith_statement,
        accuracy_statement: form.accuracy_statement,
        ownership_confirmed: form.ownership_confirmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Takedown request submitted', { description: 'We will review your case and notify you of any updates.' });
      setShowNewRequest(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
    },
    onError: (error) => {
      toast.error('Failed to submit', { description: error.message });
    },
  });

  // IP Registry
  const [registryForm, setRegistryForm] = useState({
    title: '', description: '', work_type: '' as string, proof_urls: '',
    roblox_asset_ids: '', roblox_universe_ids: '', search_keywords: '',
  });
  const [showAddWork, setShowAddWork] = useState(false);

  const addWorkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('creator_ip_registry')
        .insert({
          creator_id: user!.id,
          store_id: userStore?.id || null,
          title: registryForm.title,
          description: registryForm.description || null,
          work_type: registryForm.work_type,
          proof_urls: registryForm.proof_urls ? registryForm.proof_urls.split('\n').filter(Boolean) : [],
          roblox_asset_ids: registryForm.roblox_asset_ids ? registryForm.roblox_asset_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
          roblox_universe_ids: registryForm.roblox_universe_ids ? registryForm.roblox_universe_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
          search_keywords: registryForm.search_keywords ? registryForm.search_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast.success('Work registered', { description: 'Running initial copy scan...' });
      setShowAddWork(false);
      setRegistryForm({ title: '', description: '', work_type: '', proof_urls: '', roblox_asset_ids: '', roblox_universe_ids: '', search_keywords: '' });
      queryClient.invalidateQueries({ queryKey: ['ip-registry'] });
      
      if (data?.id) {
        try {
          const { data: scanData } = await supabase.functions.invoke('scan-roblox-copies', {
            body: { registry_entry_id: data.id },
          });
          toast.success('Initial scan complete', { description: `Found ${scanData?.total_detected || 0} potential copies.` });
          queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
          queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
        } catch {
          // Silent fail - scan will happen on next scheduled run
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to register', { description: error.message });
    },
  });

  const resetForm = () => {
    setForm({
      infringement_type: '', target_platform: '', target_platform_other: '',
      infringing_url: '', original_work_url: '', original_work_description: '',
      evidence_notes: '', good_faith_statement: false, accuracy_statement: false, ownership_confirmed: false,
    });
  };

  const canSubmit = form.infringement_type && form.target_platform && form.infringing_url &&
    form.original_work_description && form.good_faith_statement && form.accuracy_statement && form.ownership_confirmed;

  const activeCases = cases?.filter(c => !['resolved', 'rejected'].includes(c.status)) || [];
  const closedCases = cases?.filter(c => ['resolved', 'rejected'].includes(c.status)) || [];

  // ─── Not logged in — Landing page ───
  if (!user) {
    const highlights = [
      { icon: Shield, title: 'DMCA Takedown Service', description: 'We file professional DMCA takedown notices on your behalf across Roblox, Discord, YouTube and more.' },
      { icon: FileText, title: 'IP Registry', description: 'Register your original works with timestamps and proof to strengthen your ownership claims.' },
      { icon: Eye, title: 'Automated Monitoring', description: 'Weekly scans detect if your Roblox assets or games appear under a different owner.' },
      { icon: UserCheck, title: 'Verified Identity', description: 'Identity verification ensures full legal standing when acting as your DMCA agent.' },
    ];

    return (
      <MainLayout>
        <div className="relative w-full overflow-hidden -mt-4">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, hsl(var(--foreground)) 39px, hsl(var(--foreground)) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, hsl(var(--foreground)) 39px, hsl(var(--foreground)) 40px)' }} />
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-20 md:py-28 lg:py-36">
            <div className="inline-flex items-center gap-2 border border-border/60 rounded-full px-4 py-1.5 mb-8 bg-muted/30 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase tracking-[0.2em] text-[10px] font-medium text-muted-foreground">Active Protection</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black mb-6 leading-[1.05] max-w-4xl tracking-tight">
              Your Work.<br />
              <span className="text-primary">Our Fight.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              DMCA enforcement, automated monitoring, and copy detection for Roblox creators.
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 pb-16 pt-0">
          <div className="grid sm:grid-cols-2 gap-5 mb-16">
            {highlights.map((h) => (
              <Card key={h.title}>
                <CardContent className="flex gap-4 pt-6">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <h.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{h.title}</h3>
                    <p className="text-sm text-muted-foreground">{h.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">All plans include cross-platform enforcement and case tracking.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {IP_SHIELD_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                action={
                  <Button className="w-full gap-2" variant={tier.popular ? 'default' : 'outline'} asChild>
                    <Link to="/auth"><LogIn className="h-4 w-4" /> Sign In to Subscribe</Link>
                  </Button>
                }
              />
            ))}
          </div>

          <CustomPlanCard onContact={() => setShowContactForm(true)} />

          <div className="text-center text-sm text-muted-foreground mt-6">
            <p>Already have an account? <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to manage your IP Shield subscription.</p>
          </div>
        </div>
        <IPShieldContactDialog open={showContactForm} onOpenChange={setShowContactForm} />
      </MainLayout>
    );
  }

  // ─── Loading subscription ───
  if (subLoading) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <Skeleton className="h-16 w-16 mx-auto rounded-full mb-6" />
          <Skeleton className="h-8 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </MainLayout>
    );
  }

  // ─── Not subscribed — Pricing gate ───
  if (!isSubscribed) {
    return (
      <MainLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <Crown className="h-14 w-14 mx-auto text-primary/60 mb-4" />
            <h1 className="text-3xl font-display font-bold mb-2">IP Shield</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Protect your intellectual property — we'll file DMCA takedown notices on your behalf. Choose a plan to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {IP_SHIELD_TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                action={
                  <Button
                    className="w-full gap-2"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => { setSubscribing(true); startCheckout.mutate(tier.id); }}
                    disabled={subscribing || startCheckout.isPending}
                  >
                    {(subscribing || startCheckout.isPending) ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Get {tier.name}</>
                    )}
                  </Button>
                }
              />
            ))}
          </div>

          <CustomPlanCard onContact={() => setShowContactForm(true)} />
        </div>
        <IPShieldContactDialog open={showContactForm} onOpenChange={setShowContactForm} />
      </MainLayout>
    );
  }

  // ─── Loading verification ───
  if (verifyLoading) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <Skeleton className="h-16 w-16 mx-auto rounded-full mb-6" />
          <Skeleton className="h-8 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </MainLayout>
    );
  }

  // ─── Not verified — Identity gate ───
  if (!isVerified) {
    const isPending = verificationStatus?.status === 'processing';
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <UserCheck className="h-16 w-16 mx-auto text-primary/60 mb-6" />
          <h1 className="text-3xl font-display font-bold mb-3">Almost There!</h1>
          <p className="text-muted-foreground mb-2">
            Thanks for subscribing! One last step — <strong>verify your identity</strong> to activate IP Shield.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This includes uploading a government-issued ID and taking a selfie. This ensures we can act as your DMCA agent with full legal standing.
          </p>

          {isPending ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Verification in progress</span>
              </div>
              <p className="text-xs text-muted-foreground">Your identity is being reviewed. This usually takes a few minutes.</p>
              <Button variant="outline" size="sm" onClick={() => refetchVerification()}>Check Status</Button>
            </div>
          ) : (
            <Button
              onClick={() => { setVerifying(true); startVerification.mutate(); }}
              disabled={verifying || startVerification.isPending}
              className="gap-2"
            >
              {(verifying || startVerification.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting Verification...</>
              ) : (
                <><ExternalLink className="h-4 w-4" /> Verify My Identity</>
              )}
            </Button>
          )}

          {verificationStatus?.status === 'requires_input' && (
            <p className="text-xs text-muted-foreground mt-4">
              A previous verification session was started but not completed. Click above to start again.
            </p>
          )}
        </div>
      </MainLayout>
    );
  }

  // Verified + subscribed users go to the dashboard
  return <Navigate to="/ip-shield/dashboard" replace />;
}
