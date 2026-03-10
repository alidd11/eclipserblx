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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Globe, CheckCircle, ExternalLink, Copy, Trash2, RefreshCw, Zap, Link, ShoppingCart, HelpCircle, ChevronDown } from 'lucide-react';

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

      {/* Custom Domain — now free */}
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
                          <p className="text-muted-foreground">Add a <strong>CNAME</strong> record for <strong>www</strong>:</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
