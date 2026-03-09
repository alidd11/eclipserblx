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
import { Globe, CheckCircle, Clock, AlertTriangle, ExternalLink, Copy, Trash2, RefreshCw, Zap, Crown, CreditCard, Settings, Search, ShoppingCart, Link } from 'lucide-react';

const DOMAIN_REGISTRAR_URL = 'https://www.cloudflare.com/products/registrar/';

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

export default function SellerSettingsDomain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainSearchInput, setDomainSearchInput] = useState('');

  // Get seller's store
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

  // Get store domains
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

  // Check custom domain subscription
  const { data: domainSub, isLoading: subLoading } = useQuery({
    queryKey: ['domain-subscription', store?.id],
    queryFn: async () => {
      if (!store) return { subscribed: false };
      const { data, error } = await supabase.functions.invoke('domain-subscription', {
        body: { action: 'check-subscription', store_id: store.id },
      });
      if (error) return { subscribed: false };
      return data as { subscribed: boolean; current_period_end?: string; cancel_at_period_end?: boolean };
    },
    enabled: !!store,
    refetchInterval: 30000, // Refresh every 30s (in case checkout just completed)
  });

  const subdomain = domains?.find(d => d.domain_type === 'subdomain');
  const customDomains = domains?.filter(d => d.domain_type === 'custom') ?? [];
  const isSubscribed = domainSub?.subscribed === true;

  // Claim subdomain mutation
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

  // Request custom domain
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

  // Verify domain
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

  // Remove domain
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

  // Subscribe to custom domain add-on
  const startCheckout = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error('No store');
      const { data, error } = await supabase.functions.invoke('domain-subscription', {
        body: { action: 'create-checkout', store_id: store.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.open(data.url, '_blank');
      return data;
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Manage subscription
  const openManage = useMutation({
    mutationFn: async () => {
      if (!store) throw new Error('No store');
      const { data, error } = await supabase.functions.invoke('domain-subscription', {
        body: { action: 'manage', store_id: store.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.open(data.url, '_blank');
      return data;
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (storeLoading || domainsLoading || subLoading) {
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

      {/* Step Flow */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: 1, icon: ShoppingCart, label: 'Buy a Domain', desc: 'Purchase from a registrar' },
          { step: 2, icon: Crown, label: 'Subscribe', desc: 'Custom Domains add-on (£3/mo)' },
          { step: 3, icon: Link, label: 'Connect & Verify', desc: 'Point DNS to Eclipse' },
        ].map(({ step, icon: Icon, label, desc }) => {
          const isDone = step === 1
            ? !!customDomainInput || customDomains.length > 0
            : step === 2
              ? isSubscribed
              : customDomains.some(d => d.status === 'active');
          return (
            <div
              key={step}
              className={`flex flex-col items-center text-center p-3 rounded-lg border transition-colors ${
                isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                isDone ? 'bg-emerald-500 text-emerald-50' : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              <Icon className="w-4 h-4 text-muted-foreground mb-1" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          );
        })}
      </div>

      {/* Buy a Domain — Affiliate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Need a Domain?
          </CardTitle>
          <CardDescription>
            Search for your perfect domain name. You'll be redirected to our partner registrar to complete the purchase, then return here to connect it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. mystore.com"
              value={domainSearchInput}
              onChange={(e) => setDomainSearchInput(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && domainSearchInput.trim()) {
                  window.open(
                    `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainSearchInput.trim())}&aff=${NAMECHEAP_AFFILIATE_ID}`,
                    '_blank'
                  );
                }
              }}
            />
            <Button
              onClick={() => {
                if (domainSearchInput.trim()) {
                  window.open(
                    `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainSearchInput.trim())}&aff=${NAMECHEAP_AFFILIATE_ID}`,
                    '_blank'
                  );
                }
              }}
              disabled={!domainSearchInput.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Search & Buy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            After purchasing your domain, return here and follow Steps 2 & 3 to connect it to your store.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Domain registration powered by Namecheap
          </p>
        </CardContent>
      </Card>

      <Separator />
      <Card className={!isSubscribed ? 'relative overflow-hidden' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Custom Domain
                {!isSubscribed && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect your own domain (e.g., mystore.com) for a fully branded experience.
              </CardDescription>
            </div>
            {isSubscribed && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Subscribed
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openManage.mutate()} disabled={openManage.isPending}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSubscribed ? (
            /* Paywall */
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Unlock Custom Domains</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Connect your own domain to your store for a fully branded, professional storefront.
                  Your customers will see your domain — not ours.
                </p>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-foreground">£3</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2 max-w-xs mx-auto text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Connect any domain you own
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Free SSL certificate included
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Guided DNS setup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  Cancel anytime
                </li>
              </ul>
              <Button
                size="lg"
                onClick={() => startCheckout.mutate()}
                disabled={startCheckout.isPending}
                className="mt-2"
              >
                {startCheckout.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Subscribe — £3/month
              </Button>
            </div>
          ) : (
            <>
              {/* Subscription info */}
              {domainSub?.current_period_end && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {domainSub.cancel_at_period_end
                    ? `Cancels on ${new Date(domainSub.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(domainSub.current_period_end).toLocaleDateString()}`
                  }
                </div>
              )}

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
                  {requestCustom.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Add Domain
                </Button>
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

                    {/* DNS Instructions for pending/verifying domains */}
                    {(d.status === 'pending' || d.status === 'verifying') && (
                      <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                        <p className="text-sm font-medium text-foreground">DNS Setup Instructions:</p>
                        <div className="space-y-2 text-sm">
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
                              <p className="text-muted-foreground">Add a <strong>TXT</strong> record:</p>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="bg-muted px-2 py-0.5 rounded text-xs">_eclipsestore-verify.{d.domain} → {d.verification_token}</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(d.verification_token ?? '')}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
