import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Globe, Plus, RefreshCw, CheckCircle, Shield, Key, Activity,
} from 'lucide-react';
import { SubdomainSection } from '@/components/domains/SubdomainSection';
import { CustomDomainCard } from '@/components/domains/CustomDomainCard';
import { AddDomainWizard } from '@/components/domains/AddDomainWizard';
import { CloudflareCredentials } from '@/components/domains/CloudflareCredentials';

export default function SellerSettingsDomain() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('domains');

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
  const activeDomains = customDomains.filter(d => d.status === 'active');
  const sslActive = customDomains.filter(d => d.ssl_status === 'active');

  // ── Mutations ──
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
      toast.success('Subdomain claimed!');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      toast.success('Domain connected! Follow the DNS instructions to verify.');
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
        toast.success('Domain verified!', { description: `SSL: ${data.ssl_status}` });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-domains'] }),
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
      if (data.success) toast.success('DNS auto-fix complete!', { description: data.message });
      else toast.error('Auto-fix had errors', { description: data.message });
    },
    onError: (e: any) => toast.error('Auto-fix failed', { description: e.message }),
  });

  const bulkHealthCheck = useMutation({
    mutationFn: async () => {
      const activeIds = customDomains.filter(d => d.status === 'active').map(d => d.id);
      for (const id of activeIds) {
        await supabase.functions.invoke('store-domain-manager', {
          body: { action: 'health-check', domain_id: id },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-domains'] });
      toast.success('All health checks complete');
    },
    onError: (e: any) => toast.error('Bulk check failed', { description: e.message }),
  });

  // ── Loading state ──
  if (storeLoading || domainsLoading) {
    return (
      <SellerLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <div className="p-6">
          <div className="border border-border rounded-xl p-8 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You need an approved store to use custom domains.</p>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6 p-6 max-w-3xl">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Domains
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your store's subdomain, custom domains, and DNS configuration.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Domain
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Domains', value: (domains?.length ?? 0).toString(), icon: Globe },
            { label: 'Active', value: activeDomains.length.toString(), icon: CheckCircle },
            { label: 'SSL Active', value: sslActive.length.toString(), icon: Shield },
            { label: 'Cloudflare', value: cfCreds?.cloudflare_api_token ? 'Connected' : 'Not Set', icon: Key },
          ].map((stat) => (
            <div key={stat.label} className="border border-border rounded-xl px-3 py-2.5 bg-muted/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs — mobile dropdown, desktop tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="sm:hidden mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="domains">Domains</SelectItem>
                <SelectItem value="cloudflare">Cloudflare Integration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden sm:inline-flex mb-4">
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="cloudflare">
              Cloudflare Integration
              {cfCreds?.cloudflare_api_token && (
                <Badge variant="outline" className="ml-1.5 text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  Connected
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Domains Tab */}
          <TabsContent value="domains" className="space-y-4 mt-0">
            {/* Subdomain */}
            <SubdomainSection
              subdomain={subdomain}
              storeSlug={store.slug}
              onClaim={() => claimSubdomain.mutate()}
              onRemove={(id) => removeDomain.mutate(id)}
              isClaiming={claimSubdomain.isPending}
            />

            {/* Custom Domains Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Custom Domains</h2>
              {activeDomains.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => bulkHealthCheck.mutate()}
                  disabled={bulkHealthCheck.isPending}
                >
                  {bulkHealthCheck.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Activity className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Check All
                </Button>
              )}
            </div>

            {/* Domain Cards */}
            {customDomains.map((d) => (
              <CustomDomainCard
                key={d.id}
                domain={d}
                onVerify={(id) => verifyDomain.mutate(id)}
                onHealthCheck={(id) => healthCheck.mutate(id)}
                onRemove={(id) => removeDomain.mutate(id)}
                onAutoFix={(id) => autoFixDns.mutate(id)}
                isVerifying={verifyDomain.isPending && verifyDomain.variables === d.id}
                isHealthChecking={healthCheck.isPending && healthCheck.variables === d.id}
                isAutoFixing={autoFixDns.isPending && autoFixDns.variables === d.id}
                healthCheckData={healthCheck.data && healthCheck.variables === d.id ? healthCheck.data : undefined}
                hasCloudflareCredentials={!!cfCreds?.cloudflare_api_token}
              />
            ))}

            {customDomains.length === 0 && (
              <div className="border border-dashed border-border rounded-xl p-8 text-center">
                <Globe className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No custom domains yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Connect your own domain for a fully branded store experience.</p>
                <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Your First Domain
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Cloudflare Tab */}
          <TabsContent value="cloudflare" className="mt-0">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      Cloudflare Integration
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Save your Cloudflare API Token to enable one-click DNS auto-fix when issues are detected.
                    </p>
                  </div>
                  {cfCreds?.cloudflare_api_token && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                      <CheckCircle className="w-3 h-3 mr-1" />Connected
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-4">
                <CloudflareCredentials storeId={store.id} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Domain Wizard (Sheet) */}
      <AddDomainWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onPreCheck={runPreCheck}
        onConnect={(domain) => requestCustom.mutate(domain)}
        isConnecting={requestCustom.isPending}
      />
    </SellerLayout>
  );
}
