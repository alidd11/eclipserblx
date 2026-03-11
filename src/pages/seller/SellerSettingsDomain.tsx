import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Globe, CheckCircle, CheckCircle2, Circle, ExternalLink, Copy, Trash2,
  RefreshCw, Zap, Link, ShoppingCart, ChevronDown, AlertTriangle,
  Shield, CloudOff, XCircle, Info, Activity, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// ── Health check result display ──
function HealthCheckResult({ data }: { data: any }) {
  if (!data) return null;

  const isOk = !data.error_code && data.http_reachable;
  const errorMessages: Record<string, { title: string; message: string; fix: string }> = {
    'proxied_cname': {
      title: '⚠️ CNAME is Proxied (Orange Cloud)',
      message: 'Your CNAME record is set to Proxied mode. This WILL cause errors (Error 1000/1014). Even if it appears to work now, it will break.',
      fix: 'In your DNS provider dashboard (e.g. Cloudflare), click the ORANGE CLOUD icon next to your CNAME record to switch it to DNS-only (GREY cloud). This is the #1 cause of domain connection failures.',
    },
    '1000': {
      title: 'Error 1000: DNS Conflict (Cloudflare Zone)',
      message: 'Your domain is on Cloudflare which conflicts with our Cloudflare setup.',
      fix: 'Since your domain uses Cloudflare DNS, you need to either: (1) Switch your CNAME to DNS-only (grey cloud), (2) Use an A record pointing to 185.158.133.1 with DNS-only, or (3) Move DNS to a non-Cloudflare provider.',
    },
    '1000_non_cf': {
      title: 'Error 1000: DNS Configuration Issue',
      message: 'Your CNAME record is causing a conflict. This happens when a CNAME points to a Cloudflare-protected domain.',
      fix: 'Delete your CNAME record and create an A record instead. Point it to 185.158.133.1 — this bypasses the conflict entirely. If you\'re unsure how, check your DNS provider\'s help docs for "adding an A record".',
    },
    '1014': {
      title: 'Error 1014: Cross-User Banned',
      message: 'Your CNAME record is set to Proxied (orange cloud).',
      fix: 'In your Cloudflare dashboard, click the orange cloud icon next to your CNAME record to switch it to DNS-only (grey cloud).',
    },
    '522': {
      title: 'Error 522: Connection Timed Out',
      message: 'The origin server is not responding.',
      fix: 'Check that your DNS records are correctly pointing to stores.eclipserblx.com. If the issue persists, contact support.',
    },
    '523': {
      title: 'Error 523: Origin Unreachable',
      message: 'The origin server could not be reached.',
      fix: 'Verify your CNAME record points to stores.eclipserblx.com and that it is set to DNS-only (grey cloud).',
    },
    'redirect_loop': {
      title: 'Redirect Loop Detected',
      message: 'The domain is caught in an infinite redirect.',
      fix: 'Check for conflicting redirect rules, Page Rules, or "Always Use HTTPS" settings in your Cloudflare dashboard that may affect this domain.',
    },
    '403_cloudflare': {
      title: '403 Forbidden — Cloudflare Blocking',
      message: 'Your Cloudflare zone is blocking requests to this domain, likely because the CNAME is proxied (orange cloud).',
      fix: 'In your Cloudflare dashboard, switch your CNAME record to DNS-only (grey cloud), OR delete the CNAME and create an A record pointing to 185.158.133.1 (also DNS-only). This bypasses the cross-zone conflict.',
    },
    '403_direct_a': {
      title: '403 Forbidden — Wrong DNS Record Type',
      message: 'Your domain has an A record pointing directly to the origin server (185.158.133.1). This bypasses the proxy and the server doesn\'t recognise your domain.',
      fix: 'Delete the A record for your domain and instead add a CNAME record pointing to stores.eclipserblx.com — set it to DNS-only (grey cloud). This ensures traffic is routed correctly through the proxy.',
    },
    '403': {
      title: '403 Forbidden',
      message: 'Access to this domain is being blocked.',
      fix: 'Check your domain\'s WAF rules, Bot Fight Mode, and any firewall settings that may be blocking traffic. If using Cloudflare, ensure the CNAME is set to DNS-only (grey cloud).',
    },
  };

  const error = data.error_code ? errorMessages[data.error_code] : null;

  return (
    <div className="space-y-2">
      {isOk ? (
        <Alert>
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <AlertTitle className="text-emerald-600 dark:text-emerald-400">Domain is working</AlertTitle>
          <AlertDescription className="text-xs">{data.diagnosis}</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription className="text-xs mt-1 space-y-2">
            <p>{error.message}</p>
            <div className="bg-background/50 rounded p-2 border border-border">
              <p className="font-medium text-foreground text-xs mb-1">How to fix:</p>
              <p className="text-xs">{error.fix}</p>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Domain check inconclusive</AlertTitle>
          <AlertDescription className="text-xs">{data.diagnosis || 'Could not determine domain status.'}</AlertDescription>
        </Alert>
      )}

      {data.is_cloudflare_zone && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <Cloud className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Cloudflare-managed domain detected.</strong> Cross-zone conflicts are common. See the setup guide below for Cloudflare-specific instructions.
          </p>
        </div>
      )}
    </div>
  );
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

export default function SellerSettingsDomain() {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [customDomainInput, setCustomDomainInput] = useState('');

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
      if (data.is_cloudflare_zone) {
        toast.error('⚠️ Cloudflare domain detected', { description: 'Your domain uses Cloudflare DNS. Follow the Cloudflare-specific checklist carefully to avoid errors.' });
      } else {
        toast.success('Domain registered', { description: 'Follow the DNS instructions below to verify.' });
      }
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

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
          <Card>
            <CardContent className="py-8 text-center">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You need an approved store to use custom domains.</p>
            </CardContent>
          </Card>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Free Subdomain
              </CardTitle>
              <CardDescription>Your store on eclipserblx.com — included free with every store.</CardDescription>
            </div>
            {subdomain && <StatusBadge status={subdomain.status} />}
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Separator />

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Custom Domain
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                  Free
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect your own domain (e.g., mystore.com) for a fully branded experience.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prominent DNS-only warning */}
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-600 dark:text-amber-400 text-sm">Important: DNS-only mode required</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              When adding a CNAME record, you <strong className="text-foreground">MUST</strong> set it to <strong className="text-foreground">DNS-only (grey cloud)</strong>, NOT Proxied (orange cloud). 
              This is the #1 cause of domain connection failures. If you use Cloudflare, consider using an <strong className="text-foreground">A record</strong> pointing to <code className="bg-muted px-1 rounded">185.158.133.1</code> instead.
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
              onClick={() => requestCustom.mutate(customDomainInput)}
              disabled={!customDomainInput.trim() || requestCustom.isPending}
            >
              {requestCustom.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Link className="w-4 h-4 mr-2" />}
              Add Domain
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
                <CardContent className="py-4 space-y-3">
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
                  {lastHealthCheck && <HealthCheckResult data={lastHealthCheck} />}

                  {/* Health check result from mutation (live) */}
                  {healthCheck.data && healthCheck.variables === d.id && !lastHealthCheck && (
                    <HealthCheckResult data={healthCheck.data} />
                  )}

                  {/* Setup instructions for pending/verifying/failed domains */}
                  {(d.status === 'pending' || d.status === 'verifying' || d.status === 'failed') && (
                    <div className="bg-card rounded-lg p-4 border border-border space-y-4">
                      <div className="space-y-2 text-sm">
                        <p className="text-sm font-medium text-foreground">DNS Records to Add:</p>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-primary min-w-[24px]">1.</span>
                          <div>
                            <p className="text-muted-foreground">Add a <strong>CNAME</strong> record:</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="bg-muted px-2 py-0.5 rounded text-xs">{d.domain} → stores.eclipserblx.com</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard('stores.eclipserblx.com')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-primary min-w-[24px]">2.</span>
                          <div>
                            <p className="text-muted-foreground">Add a <strong>CNAME</strong> for <strong>www</strong>:</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="bg-muted px-2 py-0.5 rounded text-xs">www.{d.domain} → stores.eclipserblx.com</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard('stores.eclipserblx.com')}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
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
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-amber-500 min-w-[24px]">⚠️</span>
                            <div>
                              <p className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                                Alternative for Cloudflare users: Use an A record instead of CNAME
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="bg-muted px-2 py-0.5 rounded text-xs">{d.domain} → 185.158.133.1 (A record, DNS-only)</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard('185.158.133.1')}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
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
                </CardContent>
              </Card>
            );
          })}

          {customDomains.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No custom domains yet. Add one above to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </SellerLayout>
  );
}
