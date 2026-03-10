import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  Shield, CloudOff, XCircle, Info,
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

// ── Error explainer for common domain issues ──
function DomainErrorExplainer({ status, sslStatus, domain }: { status: string; sslStatus: string; domain: string }) {
  if (status === 'active' && sslStatus === 'active') return null;

  const errors: { icon: React.ReactNode; title: string; message: string; variant: 'destructive' | 'default' }[] = [];

  if (status === 'failed') {
    errors.push({
      icon: <XCircle className="h-4 w-4" />,
      title: 'Domain verification failed',
      message: `We couldn't verify ownership of ${domain}. Please check that your TXT record (_eclipsestore-verify.${domain}) is correctly set up and try again. DNS changes can take up to 24 hours to propagate.`,
      variant: 'destructive',
    });
  }

  if (sslStatus === 'failed') {
    errors.push({
      icon: <Shield className="h-4 w-4" />,
      title: 'SSL certificate failed',
      message: `SSL provisioning failed for ${domain}. This usually means your CNAME record is set to Proxied (orange cloud) in Cloudflare instead of DNS-only (grey cloud). Switch to DNS-only and click "Verify DNS" again.`,
      variant: 'destructive',
    });
  }

  if (sslStatus === 'pending' && status === 'active') {
    errors.push({
      icon: <Info className="h-4 w-4" />,
      title: 'SSL certificate pending',
      message: `Your domain is verified but SSL is still being provisioned. This usually takes a few minutes. If it's been more than an hour, ensure your CNAME is DNS-only (grey cloud) and not Proxied.`,
      variant: 'default',
    });
  }

  if (status === 'verifying') {
    errors.push({
      icon: <Info className="h-4 w-4" />,
      title: 'Waiting for DNS verification',
      message: `We're waiting for your DNS records to propagate. This can take up to 24 hours. Make sure your TXT record is set correctly and click "Verify DNS" to check again.`,
      variant: 'default',
    });
  }

  return (
    <div className="space-y-2">
      {errors.map((err, i) => (
        <Alert key={i} variant={err.variant}>
          {err.icon}
          <AlertTitle>{err.title}</AlertTitle>
          <AlertDescription className="text-xs mt-1">{err.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// ── Cloudflare-specific setup checklist ──
function CloudflareChecklist({ domain, verificationToken }: { domain: string; verificationToken: string | null }) {
  const steps = [
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
    {
      id: 'grey-cloud',
      label: 'Set CNAME to DNS-only (grey cloud)',
      detail: (
        <span className="text-amber-600 dark:text-amber-400 font-medium">
          Critical: Click the orange cloud icon next to your CNAME records to turn them grey. Proxied mode causes Error 1014.
        </span>
      ),
    },
    {
      id: 'no-redirect',
      label: 'Disable page rules & redirects for this domain',
      detail: 'Make sure there are no Cloudflare Page Rules, Redirect Rules, or Workers interfering with this domain.',
    },
    {
      id: 'verify',
      label: 'Click "Verify DNS" below',
      detail: 'Once all records are set, click verify. DNS propagation can take up to 24 hours.',
    },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CloudOff className="w-4 h-4 text-primary" />
          Cloudflare Setup Checklist
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

      {/* Common error reference */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Common Cloudflare Errors
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Error 1000</strong> — DNS points to prohibited IP. Your fallback origin isn't reachable. Contact support.
          </p>
          <p>
            <strong className="text-foreground">Error 1014</strong> — Cross-user banned. Your CNAME is set to <strong>Proxied (orange cloud)</strong>. Switch to <strong>DNS-only (grey cloud)</strong>.
          </p>
          <p>
            <strong className="text-foreground">Error 522/523</strong> — Connection timed out. Check your domain's DNS records are pointing to <code className="bg-muted px-1 rounded">stores.eclipserblx.com</code>.
          </p>
          <p>
            <strong className="text-foreground">ERR_TOO_MANY_REDIRECTS</strong> — You may have a Cloudflare Page Rule or redirect conflicting. Disable all rules for this domain.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SellerSettingsDomain() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      toast({ title: 'Subdomain claimed!', description: `${store?.slug}.eclipserblx.com is now active.` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      setCustomDomainInput('');
      toast({ title: 'Domain registered', description: 'Follow the DNS instructions below to verify.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
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
        toast({ title: 'Domain verified!', description: `SSL status: ${data.ssl_status}` });
      } else {
        toast({ title: 'Not verified yet', description: data.message || 'DNS may still be propagating.', variant: 'destructive' });
      }
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
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
      toast({ title: 'Domain removed' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (storeLoading || domainsLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You need an approved store to use custom domains.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
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
              <a
                href="https://www.cloudflare.com/products/registrar/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Buy one at cost on Cloudflare
              </a>{' '}
              (from ~$8/year) or from{' '}
              <a
                href="https://www.namecheap.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                Namecheap
              </a>.
            </p>
          </div>

          {/* Existing custom domains */}
          {customDomains.map((d) => (
            <Card key={d.id} className="bg-muted/30">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <code className="font-mono text-sm text-foreground">{d.domain}</code>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    {d.ssl_status === 'active' && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        SSL ✓
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Error explainer */}
                <DomainErrorExplainer status={d.status} sslStatus={d.ssl_status ?? 'pending'} domain={d.domain} />

                {/* Cloudflare checklist for pending/verifying domains */}
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
                    </div>

                    <Separator />

                    <CloudflareChecklist domain={d.domain} verificationToken={d.verification_token} />

                    <Button
                      size="sm"
                      onClick={() => verifyDomain.mutate(d.id)}
                      disabled={verifyDomain.isPending}
                    >
                      {verifyDomain.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Verify DNS
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  {d.status === 'active' && (
                    <Button variant="outline" size="sm" onClick={() => window.open(`https://${d.domain}`, '_blank')}>
                      <ExternalLink className="w-4 h-4 mr-1" /> Visit
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removeDomain.mutate(d.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {customDomains.length === 0 && (
            <p className="text-sm text-muted-foreground py-2">
              No custom domains yet. Add one above to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
