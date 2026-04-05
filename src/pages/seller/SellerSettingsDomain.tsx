import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Globe, CheckCircle, CheckCircle2, Circle, ExternalLink, Copy, Trash2,
  RefreshCw, Zap, Link, ShoppingCart, ChevronDown, AlertTriangle,
  Shield, CloudOff, XCircle, Info, Activity, Cloud, Key, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DomainHealthDisplay } from '@/components/domains/DomainHealthDisplay';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    active: { className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Active' },
    pending: { className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Pending' },
    verifying: { className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Verifying' },
    failed: { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Failed' },
    removed: { className: 'bg-muted text-muted-foreground border-border', label: 'Removed' },
  };
  const v = variants[status] ?? variants.pending;
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}


// ── Cloudflare-specific setup checklist ──
function CloudflareChecklist({ domain, verificationToken, isCloudflare }: { domain: string; verificationToken: string | null; isCloudflare: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const standardSteps = [
    {
      id: 'cname',
      label: 'Add CNAME record',
      detail: (
        <>
          Point <code className="bg-muted px-1 rounded text-xs">{domain}</code> to{' '}
          <code className="bg-muted px-1 rounded text-xs">stores.eclipserblx.com</code>
        </>
      ),
    },
    {
      id: 'www',
      label: 'Add www CNAME record',
      detail: (
        <>
          Point <code className="bg-muted px-1 rounded text-xs">www.{domain}</code> to{' '}
          <code className="bg-muted px-1 rounded text-xs">stores.eclipserblx.com</code>
        </>
      ),
    },
    {
      id: 'txt',
      label: 'Add TXT verification record',
      detail: (
        <>
          Set <code className="bg-muted px-1 rounded text-xs">_eclipsestore-verify.{domain}</code> to{' '}
          <code className="bg-muted px-1 rounded text-xs break-all">{verificationToken ?? '...'}</code>
        </>
      ),
    },
  ];

  const cloudflareSteps = [
    {
      id: 'grey-cloud',
      label: 'Set ALL records to DNS-only (grey cloud)',
      detail: (
        <span className="text-amber-600 dark:text-amber-400 font-medium">
          CRITICAL: Click the orange cloud icon next to EVERY record for this domain to turn it grey. Proxied mode causes errors.
        </span>
      ),
    },
    {
      id: 'no-redirect',
      label: 'Disable redirect rules for this domain',
      detail: 'Remove any Cloudflare Page Rules, Redirect Rules, or "Always Use HTTPS" settings that target this domain.',
    },
    {
      id: 'no-worker',
      label: 'Remove Cloudflare Workers for this domain',
      detail: 'Ensure no Cloudflare Worker routes match this domain/subdomain.',
    },
    {
      id: 'pause-cf',
      label: 'If errors persist: Pause Cloudflare or move DNS',
      detail: (
        <>
          If you still see Error 1000 after all steps, you must either{' '}
          <strong>Pause Cloudflare on your domain</strong> (Overview → Advanced Actions → Pause) or{' '}
          <strong>move your DNS to a non-Cloudflare provider</strong>.{' '}
          Alternatively, use an <strong>A record</strong> pointing to{' '}
          <code className="bg-muted px-1 rounded text-xs">185.158.133.1</code> (DNS-only) instead of a CNAME.
        </>
      ),
    },
  ];

  const steps = isCloudflare ? [...standardSteps, ...cloudflareSteps] : [...standardSteps, {
    id: 'verify',
    label: 'Click "Verify DNS" below',
    detail: 'Once all records are set, click verify. DNS propagation can take up to 24 hours.',
  }];

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          {isCloudflare ? <Cloud className="w-4 h-4 text-amber-500" /> : <CloudOff className="w-4 h-4 text-primary" />}
          {isCloudflare ? 'Cloudflare Setup Checklist' : 'Setup Checklist'}
        </p>
        <span className="text-xs text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => toggle(step.id)}
            className={cn(
              'flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors',
              checked[step.id] ? 'opacity-60' : 'hover:bg-muted/50'
            )}
          >
            {checked[step.id] ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', checked[step.id] && 'line-through text-muted-foreground')}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
            </div>
          </button>
        ))}
      </div>

      {isCloudflare && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Common Cloudflare Errors
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Error 1000</strong> — Cross-zone conflict. Your domain is on Cloudflare and clashes with our Cloudflare setup. Pause CF or move DNS.
            </p>
            <p>
              <strong className="text-foreground">Error 1014</strong> — CNAME is <strong>Proxied (orange)</strong>. Switch to <strong>DNS-only (grey)</strong>.
            </p>
            <p>
              <strong className="text-foreground">ERR_TOO_MANY_REDIRECTS</strong> — Remove redirect rules or "Always Use HTTPS" for this domain.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cloudflare Credentials Card ──
function CloudflareCredentialsCard({ storeId }: { storeId: string }) {
  const [tokenInput, setTokenInput] = useState('');
  const [zoneIdInput, setZoneIdInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: creds, isLoading } = useQuery({
    queryKey: ['cf-creds', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('store_credentials')
        .select('cloudflare_api_token, cloudflare_zone_id')
        .eq('store_id', storeId)
        .single();
      return data;
    },
  });

  const hasToken = !!creds?.cloudflare_api_token;
  const hasZoneId = !!creds?.cloudflare_zone_id;
  const maskedToken = hasToken ? `••••••••${(creds.cloudflare_api_token as string).slice(-4)}` : '';

  const saveCreds = useMutation({
    mutationFn: async () => {
      const updates: Record<string, string> = {};
      if (tokenInput.trim()) updates.cloudflare_api_token = tokenInput.trim();
      if (zoneIdInput.trim()) updates.cloudflare_zone_id = zoneIdInput.trim();
      if (Object.keys(updates).length === 0) throw new Error('Enter at least one field');
      
      const { error } = await supabase
        .from('store_credentials')
        .update(updates)
        .eq('store_id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cf-creds'] });
      setTokenInput('');
      setZoneIdInput('');
      toast.success('Cloudflare credentials saved');
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const clearCreds = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('store_credentials')
        .update({ cloudflare_api_token: null, cloudflare_zone_id: null })
        .eq('store_id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cf-creds'] });
      toast.success('Cloudflare credentials removed');
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              Cloudflare Integration
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Save your Cloudflare API Token to enable one-click DNS auto-fix when issues are detected.
            </p>
          </div>
          {hasToken && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <CheckCircle className="w-3 h-3 mr-1" /> Connected
            </Badge>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Permissions Guide */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left">
              <Info className="w-4 h-4 shrink-0" />
              <span>How to create your Cloudflare API Token</span>
              <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", guideOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Create your API Token:</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">dash.cloudflare.com → My Profile → API Tokens</a></li>
                  <li>Click <strong className="text-foreground">Create Token</strong></li>
                  <li>Use the <strong className="text-foreground">"Edit zone DNS"</strong> template, or create a custom token with:
                    <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                      <li><strong className="text-foreground">Permissions:</strong> Zone → DNS → Edit</li>
                      <li><strong className="text-foreground">Zone Resources:</strong> Include → Specific zone → <em>(select your domain)</em></li>
                    </ul>
                  </li>
                  <li>Click <strong className="text-foreground">Continue to summary</strong> → <strong className="text-foreground">Create Token</strong></li>
                  <li>Copy the token and paste it below</li>
                </ol>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Find your Zone ID:</p>
                <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                  <li>Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">dash.cloudflare.com</a> → select your domain</li>
                  <li>On the Overview page, scroll down to the <strong className="text-foreground">right sidebar</strong></li>
                  <li>Copy the <strong className="text-foreground">Zone ID</strong> value</li>
                </ol>
              </div>

              <Alert className="border-primary/20 bg-primary/5">
                <Shield className="h-4 w-4 text-primary" />
                <AlertTitle className="text-sm">Minimum permissions needed</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Only <strong className="text-foreground">Zone:DNS:Edit</strong> scoped to your specific zone. No account-level access required. Your token is stored securely and only used when you click "Auto-Fix".
                </AlertDescription>
              </Alert>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Current status */}
        {hasToken && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Key className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">API Token</p>
              <p className="text-sm font-mono text-foreground">{maskedToken}</p>
            </div>
            {hasZoneId && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Zone ID</p>
                <p className="text-sm font-mono text-foreground truncate">{creds.cloudflare_zone_id}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearCreds.mutate()}
              disabled={clearCreds.isPending}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}

        {/* Input fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cf-token" className="text-xs">API Token {hasToken && '(leave blank to keep current)'}</Label>
            <div className="relative">
              <Input
                id="cf-token"
                type={showToken ? 'text' : 'password'}
                placeholder={hasToken ? '••••••••' : 'Paste your Cloudflare API token'}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-zone" className="text-xs">Zone ID {hasZoneId && '(leave blank to keep current)'}</Label>
            <Input
              id="cf-zone"
              placeholder={hasZoneId ? creds.cloudflare_zone_id ?? '' : 'Paste your Cloudflare Zone ID'}
              value={zoneIdInput}
              onChange={(e) => setZoneIdInput(e.target.value)}
            />
          </div>

          <Button
            onClick={() => saveCreds.mutate()}
            disabled={saveCreds.isPending || (!tokenInput.trim() && !zoneIdInput.trim())}
            size="sm"
          >
            {saveCreds.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
            {hasToken ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SellerSettingsDomain() {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [preCheckResult, setPreCheckResult] = useState<{
    domain: string;
    is_cloudflare: boolean;
    has_proxied_records: boolean;
    has_conflicting_records: boolean;
    dns_ready: boolean;
    records_to_remove: Array<{ type: string; name: string; content: string; reason: string }>;
    records_to_add: Array<{ type: string; name: string; content: string; proxied: boolean; note: string }>;
    warnings: string[];
    existing_a_records: string[];
    existing_aaaa_records: string[];
    cname_target: string | null;
    cname_is_proxied: boolean;
  } | null>(null);
  const [preChecking, setPreChecking] = useState(false);
  const [wizardStep, setWizardStep] = useState<'check' | 'fix' | 'ready'>('check');
  const [recheckLoading, setRecheckLoading] = useState(false);

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['seller-store-for-domain', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('stores')
        .select('id, slug, name')
        .eq('owner_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['store-domains', store?.id],
    queryFn: async () => {
      if (!store) return [];
      const { data } = await supabase
        .from('store_domains')
        .select('*')
        .eq('store_id', store.id)
        .neq('status', 'removed')
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!store,
  });

  const { data: cfCreds } = useQuery({
    queryKey: ['cf-creds', store?.id],
    queryFn: async () => {
      if (!store) return null;
      const { data } = await supabase
        .from('store_credentials')
        .select('cloudflare_api_token, cloudflare_zone_id')
        .eq('store_id', store.id)
        .single();
      return data;
    },
    enabled: !!store,
  });

  const subdomain = domains?.find(d => d.domain_type === 'subdomain');
  const customDomains = domains?.filter(d => d.domain_type === 'custom') ?? [];

  const claimSubdomain = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error('No store');
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'claim-subdomain', store_id: store.id, slug: store.slug },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      toast.success('Subdomain claimed!', { description: `${store?.slug}.eclipserblx.com is now active.` });
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const requestCustom = useMutation({
    mutationFn: async (domain: string) => {
      if (!store) throw new Error('No store');
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'request-custom-domain', store_id: store.id, domain },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      setCustomDomainInput('');
      setPreCheckResult(null);
      setWizardStep('check');
      if (data.is_cloudflare_zone) {
        toast.success('Domain registered', { description: 'Your domain was added. Follow the DNS instructions below to verify.' });
      } else {
        toast.success('Domain registered', { description: 'Follow the DNS instructions below to verify.' });
      }
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const runPreCheck = useCallback(async (domain: string) => {
    const { data, error } = await supabase.functions.invoke('store-domain-manager', {
      body: { action: 'pre-check-domain', domain },
    });
    if (error) throw error;
    return data;
  }, []);

  const handleAddDomain = useCallback(async () => {
    const domain = customDomainInput.trim().toLowerCase();
    if (!domain) return;
    setPreChecking(true);
    try {
      const data = await runPreCheck(domain);
      
      if (data?.has_proxied_records || data?.has_conflicting_records) {
        // Show the wizard with issues to fix
        setPreCheckResult(data);
        setWizardStep('fix');
        return;
      }
      
      if (data?.is_cloudflare && !data?.dns_ready) {
        // Cloudflare zone but no blocking issues — show info then allow proceed
        setPreCheckResult(data);
        setWizardStep('ready');
        return;
      }
      
      // No issues — proceed directly
      requestCustom.mutate(domain);
    } catch (e: any) {
      // Pre-check failed — proceed anyway (don't block the user)
      console.warn('Pre-check failed, proceeding:', e);
      requestCustom.mutate(domain);
    } finally {
      setPreChecking(false);
    }
  }, [customDomainInput, requestCustom, runPreCheck]);

  const handleRecheckDns = useCallback(async () => {
    if (!preCheckResult?.domain) return;
    setRecheckLoading(true);
    try {
      const data = await runPreCheck(preCheckResult.domain);
      setPreCheckResult(data);
      if (data?.dns_ready || (!data?.has_proxied_records && !data?.has_conflicting_records)) {
        setWizardStep('ready');
        toast.success('DNS looks good!', { description: 'Your records are correctly configured. You can now proceed.' });
      } else {
        toast.error('Issues still detected', { description: 'Please fix the DNS records listed below and try again.' });
      }
    } catch (e: any) {
      toast.error('Re-check failed', { description: e.message });
    } finally {
      setRecheckLoading(false);
    }
  }, [preCheckResult?.domain, runPreCheck]);

  const verifyDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'verify-custom-domain', domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      if (data.verified) {
        if (data.health_check?.error_code) {
          toast.error('Verified but issue detected', { description: `Domain verified & SSL provisioned, but a health check found: ${data.health_check.diagnosis}` });
        } else {
          toast.success('Domain verified!', { description: `SSL status: ${data.ssl_status}` });
        }
      } else {
        toast.error('Not verified yet', { description: data.message || 'DNS may still be propagating.' });
      }
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const healthCheck = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'health-check', domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
    },
    onError: (e: any) => toast.error('Health check failed', { description: e.message }),
  });

  const removeDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'remove-domain', domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      toast.success('Domain removed');
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const autoFixDns = useMutation({
    mutationFn: async (domainId: string) => {
      const { data, error } = await supabase.functions.invoke('store-domain-manager', {
        body: { action: 'auto-fix-dns', domain_id: domainId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      if (data.success) {
        toast.success('DNS auto-fix complete!', { description: data.message });
      } else {
        toast.error('Auto-fix completed with errors', { description: data.message });
      }
    },
    onError: (e: any) => toast.error('Auto-fix failed', { description: e.message }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (storeLoading || domainsLoading) {
    return (
      <SellerLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <div className="p-6">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="p-4 py-8 text-center">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You need an approved store to use custom domains.</p>
            </div>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-6 h-6" />
          Custom Domain
        </h1>
        <p className="text-muted-foreground mt-1">
          Give your store a professional URL with a free subdomain or your own custom domain.
        </p>
      </div>

      {/* Free Subdomain Section */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Free Subdomain
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your store on eclipserblx.com — included free with every store.</p>
            </div>
            {subdomain && <StatusBadge status={subdomain.status} />}
          </div>
        </div>
        <div className="p-4">
          {subdomain ? (
            <div className="flex items-center gap-3">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono text-foreground">
                {subdomain.domain}
              </code>
              <Button variant="outline" size="sm" onClick={() => window.open(`https://${subdomain.domain}`, '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeDomain.mutate(subdomain.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claim <strong>{store.slug}.eclipserblx.com</strong> as your store's free subdomain.
              </p>
              <Button onClick={() => claimSubdomain.mutate()} disabled={claimSubdomain.isPending}>
                {claimSubdomain.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                Claim Subdomain
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Custom Domain */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Custom Domain
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                  Free
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your own domain (e.g., mystore.com) for a fully branded experience.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Prominent DNS-only warning */}
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400 text-sm">Important: DNS-only mode required</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              When adding DNS records, you <strong className="text-foreground">MUST</strong> set them to <strong className="text-foreground">DNS-only (grey cloud)</strong>, NOT Proxied (orange cloud). 
              This is the #1 cause of domain connection failures. Your DNS records point to our edge router, which then routes traffic to your store.
            </AlertDescription>
          </Alert>

          {/* Add new custom domain */}
          <div className="flex gap-2">
            <Input
              placeholder="mystore.com"
              value={customDomainInput}
              onChange={(e) => setCustomDomainInput(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleAddDomain}
              disabled={!customDomainInput.trim() || requestCustom.isPending || preChecking}
            >
              {(requestCustom.isPending || preChecking) ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
              {preChecking ? 'Checking…' : 'Add Domain'}
            </Button>
          </div>

          {/* Need a domain? CTA */}
          <div className="flex items-center gap-2 px-1">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Need a domain?{' '}
              <a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                Buy one at cost on Cloudflare
              </a>{' '}
              (from ~$8/year) or from{' '}
              <a href="https://www.namecheap.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                Namecheap
              </a>.
            </p>
          </div>

          {/* Existing custom domains */}
          {customDomains.map((d) => {
            const isCloudflare = !!(d as any).is_cloudflare_zone;
            const lastHealthCheck = (d as any).last_health_check;

            return (
              <Card key={d.id} className="bg-muted/30">
                <div className="p-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-foreground">{d.domain}</code>
                      {isCloudflare && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                          <Cloud className="w-3 h-3 mr-1" />
                          Cloudflare
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      {d.ssl_status === 'active' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          SSL ✓
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Health check results */}
                  {lastHealthCheck && (
                    <DomainHealthDisplay
                      healthCheck={lastHealthCheck}
                      domain={d.domain}
                      isCloudflare={isCloudflare}
                      onAutoFix={() => autoFixDns.mutate(d.id)}
                      isAutoFixing={autoFixDns.isPending && autoFixDns.variables === d.id}
                      hasCloudflareCredentials={!!cfCreds?.cloudflare_api_token}
                    />
                  )}

                  {/* Health check result from mutation (live) */}
                  {healthCheck.data && healthCheck.variables === d.id && !lastHealthCheck && (
                    <DomainHealthDisplay
                      healthCheck={healthCheck.data as any}
                      domain={d.domain}
                      isCloudflare={isCloudflare}
                      onAutoFix={() => autoFixDns.mutate(d.id)}
                      isAutoFixing={autoFixDns.isPending && autoFixDns.variables === d.id}
                      hasCloudflareCredentials={!!cfCreds?.cloudflare_api_token}
                    />
                  )}

                  {/* Setup instructions for pending/verifying/failed domains */}
                  {(d.status === 'pending' || d.status === 'verifying' || d.status === 'failed') && (
                    <div className="bg-card rounded-lg p-4 border border-border space-y-4">
                      <div className="space-y-2 text-sm">
                        <p className="text-sm font-medium text-foreground">DNS Records to Add:</p>
                        
                        {/* Dynamic DNS instructions based on domain type */}
                        {(() => {
                          // For Cloudflare zones, recommend CNAME; for others, CNAME too (backend determines)
                          const apexTarget = isCloudflare ? 'stores.eclipserblx.com' : 'stores.eclipserblx.com';
                          const apexType = isCloudflare ? 'CNAME' : 'CNAME';
                          
                          return (
                            <>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-primary min-w-[24px]">1.</span>
                                <div>
                                  <p className="text-muted-foreground">Add a <strong>{apexType}</strong> record:</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="bg-muted px-2 py-0.5 rounded text-xs">{d.domain} → {apexTarget}</code>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(apexTarget)}>
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                                    This points your domain to our edge router, which then routes traffic to your store.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-primary min-w-[24px]">2.</span>
                                <div>
                                  <p className="text-muted-foreground">Add a <strong>CNAME</strong> for <strong>www</strong>:</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="bg-muted px-2 py-0.5 rounded text-xs">www.{d.domain} → {apexTarget}</code>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(apexTarget)}>
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                        
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-primary min-w-[24px]">3.</span>
                          <div>
                            <p className="text-muted-foreground">Add a <strong>TXT</strong> record:</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="bg-muted px-2 py-0.5 rounded text-xs break-all">_eclipsestore-verify.{d.domain} → {d.verification_token}</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(d.verification_token ?? '')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {isCloudflare && (
                          <Alert className="border-amber-500/30 bg-amber-500/5 mt-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <AlertTitle className="text-xs text-amber-600 dark:text-amber-400">Cloudflare users: DNS-only is critical</AlertTitle>
                            <AlertDescription className="text-xs text-muted-foreground">
                              All records <strong className="text-foreground">MUST</strong> be set to DNS-only (grey cloud). 
                              Proxied (orange cloud) will cause Error 1000 or Error 1014.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      <Separator />

                      <CloudflareChecklist
                        domain={d.domain}
                        verificationToken={d.verification_token}
                        isCloudflare={isCloudflare}
                      />

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => verifyDomain.mutate(d.id)}
                          disabled={verifyDomain.isPending}
                        >
                          {verifyDomain.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Verify DNS
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions for active domains */}
                  <div className="flex gap-2">
                    {d.status === 'active' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://${d.domain}`, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-1" /> Visit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => healthCheck.mutate(d.id)}
                          disabled={healthCheck.isPending}
                        >
                          {healthCheck.isPending ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Activity className="w-4 h-4 mr-1" />}
                          Health Check
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeDomain.mutate(d.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {customDomains.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No custom domains yet. Add one above to get started.
            </p>
          )}
        </div>
      </div>

      {/* Cloudflare Integration */}
      {store && <CloudflareCredentialsCard storeId={store.id} />}

      {/* Domain Setup Wizard Dialog */}
      <AlertDialog open={!!preCheckResult} onOpenChange={(open) => { if (!open) { setPreCheckResult(null); setWizardStep('check'); } }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {wizardStep === 'fix' ? (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  DNS Issues Found — Fix Before Connecting
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  DNS Ready — Connect Domain
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {/* Warnings */}
                {preCheckResult?.warnings && preCheckResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    {preCheckResult.warnings.map((w, i) => (
                      <div key={i} className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                        <p className="text-xs text-destructive">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Records to Remove */}
                {preCheckResult?.records_to_remove && preCheckResult.records_to_remove.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      Records to Delete / Fix
                    </p>
                    <div className="space-y-1.5">
                      {preCheckResult.records_to_remove.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/10 p-2.5">
                          <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground">
                              {r.type} record: <code className="bg-muted px-1 rounded">{r.name}</code> → <code className="bg-muted px-1 rounded break-all">{r.content}</code>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Records to Add */}
                {preCheckResult?.records_to_add && preCheckResult.records_to_add.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Records to Add
                    </p>
                    <div className="space-y-1.5">
                      {preCheckResult.records_to_add.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 p-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-foreground">
                                {r.type} record: <code className="bg-muted px-1 rounded">{r.name}</code> → <code className="bg-muted px-1 rounded">{r.content}</code>
                              </p>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(r.content)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {r.note} — <strong className="text-foreground">DNS-only (grey cloud)</strong>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cloudflare-specific note */}
                {preCheckResult?.is_cloudflare && wizardStep === 'fix' && (
                  <Alert className="border-amber-500/30 bg-amber-500/5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-xs text-amber-600 dark:text-amber-400">Why does this happen?</AlertTitle>
                    <AlertDescription className="text-[11px] text-muted-foreground">
                      Both your domain and our platform use Cloudflare. When DNS records are "Proxied" (orange cloud), 
                      Cloudflare tries to route traffic through <strong className="text-foreground">two separate Cloudflare zones</strong>, causing Error 1000.
                      Setting records to <strong className="text-foreground">DNS-only (grey cloud)</strong> bypasses this conflict entirely.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {wizardStep === 'fix' ? (
              <Button
                onClick={handleRecheckDns}
                disabled={recheckLoading}
              >
                {recheckLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                I've fixed it — Re-check DNS
              </Button>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  if (preCheckResult) {
                    requestCustom.mutate(preCheckResult.domain);
                  }
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Connect Domain
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </SellerLayout>
  );
}
