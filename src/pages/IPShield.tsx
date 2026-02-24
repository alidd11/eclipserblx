import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, Plus, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Send, Eye, LogIn, UserCheck, Loader2, ExternalLink,
  CreditCard, Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: Clock },
  reviewing: { label: 'Under Review', variant: 'default', icon: Eye },
  notice_sent: { label: 'Notice Sent', variant: 'default', icon: Send },
  resolved: { label: 'Resolved', variant: 'secondary', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  counter_notice: { label: 'Counter-Notice', variant: 'outline', icon: AlertTriangle },
};

const PLATFORM_LABELS: Record<string, string> = {
  roblox: 'Roblox',
  discord: 'Discord',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  other_marketplace: 'Other Marketplace',
  other: 'Other',
};

const TYPE_LABELS: Record<string, string> = {
  copyright: 'Copyright Infringement',
  trademark: 'Trademark Violation',
  stolen_asset: 'Stolen Asset',
  unauthorized_resale: 'Unauthorized Resale',
  other: 'Other',
};

export default function IPShield() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');

  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check IP Shield subscription status (first gate)
  const { data: subscriptionStatus, isLoading: subLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['ip-shield-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; tier?: string; limits?: { takedowns_per_month: number; registry_limit: number; priority: boolean; monitoring: boolean; dedicated_agent: boolean }; subscription_end?: string; subscription_id?: string };
    },
    enabled: !!user,
  });

  const isSubscribed = subscriptionStatus?.subscribed === true;

  // Check identity verification status (second gate, only after subscribed)
  const { data: verificationStatus, isLoading: verifyLoading, refetch: refetchVerification } = useQuery({
    queryKey: ['ip-shield-identity-verification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      if (error) throw error;
      return data as { verified: boolean; status: string; verifiedAt?: string };
    },
    enabled: !!user && isSubscribed,
  });

  const isVerified = verificationStatus?.verified === true;

  // Re-check verification when returning from Stripe
  useEffect(() => {
    if (searchParams.get('verification') === 'complete' && user) {
      refetchVerification();
    }
    if (searchParams.get('subscription') === 'success' && user) {
      refetchSubscription();
    }
  }, [searchParams, user, refetchVerification, refetchSubscription]);

  // Start identity verification
  const startVerification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-identity-verification');
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
      setVerifying(false);
    },
  });

  // Start IP Shield subscription checkout
  const startCheckout = useMutation({
    mutationFn: async (tier: string) => {
      const { data, error } = await supabase.functions.invoke('create-ip-shield-checkout', {
        body: { tier },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({ title: 'Checkout failed', description: error.message, variant: 'destructive' });
      setSubscribing(false);
    },
  });

  // Get user's store for linking
  const { data: userStore } = useQuery({
    queryKey: ['ip-shield-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user!.id)
        .limit(1);
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

  // Fetch takedown requests
  const { data: cases, isLoading } = useQuery({
    queryKey: ['takedown-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('takedown_requests')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  // Fetch IP registry
  const { data: ipRegistry, isLoading: registryLoading } = useQuery({
    queryKey: ['ip-registry', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_ip_registry')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  // Submit takedown request
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('takedown_requests')
        .insert({
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
      toast({ title: 'Takedown request submitted', description: 'We will review your case and notify you of any updates.' });
      setShowNewRequest(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    },
  });

  // IP Registry
  const [registryForm, setRegistryForm] = useState({
    title: '',
    description: '',
    work_type: '' as string,
    proof_urls: '',
    roblox_asset_ids: '',
  });
  const [showAddWork, setShowAddWork] = useState(false);

  const addWorkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('creator_ip_registry')
        .insert({
          creator_id: user!.id,
          store_id: userStore?.id || null,
          title: registryForm.title,
          description: registryForm.description || null,
          work_type: registryForm.work_type,
          proof_urls: registryForm.proof_urls ? registryForm.proof_urls.split('\n').filter(Boolean) : [],
          roblox_asset_ids: registryForm.roblox_asset_ids ? registryForm.roblox_asset_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Work registered', description: 'Your intellectual property has been added to the registry.' });
      setShowAddWork(false);
      setRegistryForm({ title: '', description: '', work_type: '', proof_urls: '', roblox_asset_ids: '' });
      queryClient.invalidateQueries({ queryKey: ['ip-registry'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to register', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setForm({
      infringement_type: '',
      target_platform: '',
      target_platform_other: '',
      infringing_url: '',
      original_work_url: '',
      original_work_description: '',
      evidence_notes: '',
      good_faith_statement: false,
      accuracy_statement: false,
      ownership_confirmed: false,
    });
  };

  const canSubmit = form.infringement_type && form.target_platform && form.infringing_url &&
    form.original_work_description && form.good_faith_statement && form.accuracy_statement && form.ownership_confirmed;

  const activeCases = cases?.filter(c => !['resolved', 'rejected'].includes(c.status)) || [];
  const closedCases = cases?.filter(c => ['resolved', 'rejected'].includes(c.status)) || [];

  // Not logged in
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <Shield className="h-16 w-16 mx-auto text-primary mb-6" />
          <h1 className="text-3xl font-display font-bold mb-3">IP Shield</h1>
          <p className="text-muted-foreground mb-6">
            Protect your intellectual property — we'll file takedown notices on your behalf. Sign in to get started.
          </p>
          <Button asChild>
            <Link to="/auth"><LogIn className="h-4 w-4 mr-2" /> Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Loading subscription status
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

  // Not subscribed — show 3-tier pricing (first gate)
  if (!isSubscribed) {
    const tiers = [
      {
        id: 'starter',
        name: 'Starter',
        price: '19.99',
        description: 'Essential protection for individual creators',
        features: [
          '3 takedown requests/month',
          '15 registered works',
          'Case tracking & updates',
          'Cross-platform enforcement',
        ],
        disabledFeatures: ['Priority handling', 'Monitoring & alerts', 'Dedicated agent'],
        popular: false,
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '29.99',
        description: 'Advanced protection for serious creators',
        features: [
          '15 takedown requests/month',
          'Unlimited registered works',
          'Case tracking & updates',
          'Cross-platform enforcement',
          'Priority handling',
          'Monitoring & alerts',
        ],
        disabledFeatures: ['Dedicated agent'],
        popular: true,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: '79.99',
        description: 'Complete protection with dedicated support',
        features: [
          'Unlimited takedown requests',
          'Unlimited registered works',
          'Case tracking & updates',
          'Cross-platform enforcement',
          'Priority handling',
          'Monitoring & alerts',
          'Dedicated DMCA agent',
        ],
        disabledFeatures: [],
        popular: false,
      },
    ];

    return (
      <MainLayout>
        <div className="container py-16 max-w-5xl">
          <div className="text-center mb-10">
            <Crown className="h-14 w-14 mx-auto text-primary/60 mb-4" />
            <h1 className="text-3xl font-display font-bold mb-2">IP Shield</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Protect your intellectual property — we'll file DMCA takedown notices on your behalf. Choose a plan to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : ''}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold">£{tier.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm flex-1 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                    {tier.disabledFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground/50">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => {
                      setSubscribing(true);
                      startCheckout.mutate(tier.id);
                    }}
                    disabled={subscribing || startCheckout.isPending}
                  >
                    {(subscribing || startCheckout.isPending) ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Get {tier.name}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Loading verification
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

  // Not verified — show identity verification prompt (second gate)
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
              <p className="text-xs text-muted-foreground">
                Your identity is being reviewed. This usually takes a few minutes.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchVerification()}>
                Check Status
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                setVerifying(true);
                startVerification.mutate();
              }}
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

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-2">
                <Shield className="h-7 w-7 text-primary" />
                IP Shield
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Protect your intellectual property — we'll file takedown notices on your behalf.
              </p>
            </div>
            <Button onClick={() => setShowNewRequest(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Takedown Request
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{cases?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Total Cases</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{activeCases.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{closedCases.filter(c => c.status === 'resolved').length}</div>
                <div className="text-xs text-muted-foreground">Resolved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-2xl font-bold">{ipRegistry?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Registered Works</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="cases">Takedown Cases</TabsTrigger>
              <TabsTrigger value="registry">IP Registry</TabsTrigger>
            </TabsList>

            {/* Cases Tab */}
            <TabsContent value="cases" className="space-y-4 mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : cases?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold text-lg">No takedown requests yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      If someone is using your work without permission, submit a takedown request and we'll handle it for you.
                    </p>
                    <Button className="mt-4" onClick={() => setShowNewRequest(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Your First Request
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {cases?.map(c => {
                    const statusConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
                    const StatusIcon = statusConf.icon;
                    return (
                      <Card key={c.id} className="hover:border-primary/30 transition-colors">
                        <CardContent className="py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-medium">{c.case_number}</span>
                                <Badge variant={statusConf.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConf.label}
                                </Badge>
                                <Badge variant="outline">{TYPE_LABELS[c.infringement_type] || c.infringement_type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {PLATFORM_LABELS[c.target_platform] || c.target_platform} · {c.infringing_url}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Submitted {format(new Date(c.created_at), 'MMM d, yyyy')}
                                {c.resolved_at && ` · Resolved ${format(new Date(c.resolved_at), 'MMM d, yyyy')}`}
                              </p>
                            </div>
                            {c.resolution_notes && (
                              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-w-xs">
                                <span className="font-medium">Resolution: </span>{c.resolution_notes}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* IP Registry Tab */}
            <TabsContent value="registry" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Register your original works for faster takedown processing.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowAddWork(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Work
                </Button>
              </div>

              {registryLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : ipRegistry?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-semibold">No registered works</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Registering your original works helps us process takedown requests faster.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {ipRegistry?.map(work => (
                    <Card key={work.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{work.title}</span>
                              <Badge variant="outline" className="capitalize">{work.work_type}</Badge>
                            </div>
                            {work.description && (
                              <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Registered {format(new Date(work.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* New Takedown Request Dialog */}
          <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  New Takedown Request
                </DialogTitle>
                <DialogDescription>
                  Provide details about the infringement and we'll file a takedown notice on your behalf.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Infringement Type *</Label>
                  <Select value={form.infringement_type} onValueChange={v => setForm(f => ({ ...f, infringement_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Platform *</Label>
                  <Select value={form.target_platform} onValueChange={v => setForm(f => ({ ...f, target_platform: v }))}>
                    <SelectTrigger><SelectValue placeholder="Where is the infringement?" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.target_platform === 'other' && (
                  <div className="space-y-2">
                    <Label>Platform Name</Label>
                    <Input
                      value={form.target_platform_other}
                      onChange={e => setForm(f => ({ ...f, target_platform_other: e.target.value }))}
                      placeholder="Specify the platform..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Infringing Content URL *</Label>
                  <Input
                    value={form.infringing_url}
                    onChange={e => setForm(f => ({ ...f, infringing_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Your Original Work URL</Label>
                  <Input
                    value={form.original_work_url}
                    onChange={e => setForm(f => ({ ...f, original_work_url: e.target.value }))}
                    placeholder="Link to your original work (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description of Your Original Work *</Label>
                  <Textarea
                    value={form.original_work_description}
                    onChange={e => setForm(f => ({ ...f, original_work_description: e.target.value }))}
                    placeholder="Describe your original work and how it's being infringed..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Evidence or Notes</Label>
                  <Textarea
                    value={form.evidence_notes}
                    onChange={e => setForm(f => ({ ...f, evidence_notes: e.target.value }))}
                    placeholder="Any additional evidence, timestamps, screenshots links, etc."
                    rows={2}
                  />
                </div>

                {/* Legal declarations */}
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-xs text-muted-foreground font-medium">Legal Declarations</p>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="good_faith"
                      checked={form.good_faith_statement}
                      onCheckedChange={v => setForm(f => ({ ...f, good_faith_statement: !!v }))}
                    />
                    <Label htmlFor="good_faith" className="text-xs leading-relaxed">
                      I have a good faith belief that the use of this material is not authorised by the copyright owner, its agent, or the law.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="accuracy"
                      checked={form.accuracy_statement}
                      onCheckedChange={v => setForm(f => ({ ...f, accuracy_statement: !!v }))}
                    />
                    <Label htmlFor="accuracy" className="text-xs leading-relaxed">
                      The information in this notice is accurate, and under penalty of perjury, I am the owner or authorised to act on behalf of the owner.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="ownership"
                      checked={form.ownership_confirmed}
                      onCheckedChange={v => setForm(f => ({ ...f, ownership_confirmed: !!v }))}
                    />
                    <Label htmlFor="ownership" className="text-xs leading-relaxed">
                      I confirm that I own or have exclusive rights to the work described above.
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancel</Button>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={!canSubmit || submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Register Work Dialog */}
          <Dialog open={showAddWork} onOpenChange={setShowAddWork}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register Original Work</DialogTitle>
                <DialogDescription>
                  Pre-register your intellectual property for faster takedown processing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Work Title *</Label>
                  <Input
                    value={registryForm.title}
                    onChange={e => setRegistryForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Name of your creation"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={registryForm.work_type} onValueChange={v => setRegistryForm(f => ({ ...f, work_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Type of work..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="script">Script</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                      <SelectItem value="ui">UI/Interface</SelectItem>
                      <SelectItem value="game">Game</SelectItem>
                      <SelectItem value="brand">Brand/Logo</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={registryForm.description}
                    onChange={e => setRegistryForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your work..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Proof URLs (one per line)</Label>
                  <Textarea
                    value={registryForm.proof_urls}
                    onChange={e => setRegistryForm(f => ({ ...f, proof_urls: e.target.value }))}
                    placeholder="Links to screenshots, videos, or published works..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Roblox Asset IDs (comma-separated)</Label>
                  <Input
                    value={registryForm.roblox_asset_ids}
                    onChange={e => setRegistryForm(f => ({ ...f, roblox_asset_ids: e.target.value }))}
                    placeholder="123456, 789012"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddWork(false)}>Cancel</Button>
                <Button
                  onClick={() => addWorkMutation.mutate()}
                  disabled={!registryForm.title || !registryForm.work_type || addWorkMutation.isPending}
                >
                  {addWorkMutation.isPending ? 'Registering...' : 'Register Work'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  );
}
