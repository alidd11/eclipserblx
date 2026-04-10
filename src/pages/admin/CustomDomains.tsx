import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
 Globe, CheckCircle, XCircle, Cloud, AlertTriangle, RefreshCw,
 Activity, Search, ExternalLink, Shield, Clock, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DomainHealthDisplay } from '@/components/domains/DomainHealthDisplay';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';

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

function SslBadge({ status }: { status: string | null }) {
 if (status === 'active') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">SSL Active</Badge>;
 if (status === 'pending') return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">SSL Pending</Badge>;
 return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">No SSL</Badge>;
}

function HealthBadge({ healthCheck }: { healthCheck: any }) {
 if (!healthCheck) return <span className="text-xs text-muted-foreground">No check</span>;
 const errorCode = healthCheck.error_code;
 if (!errorCode && healthCheck.http_reachable) {
 return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Healthy</Badge>;
 }
 const label = errorCode === '1000' ? 'Error 1000' :
 errorCode === '1014' ? 'Error 1014' :
 errorCode === 'hostname_provisioning' ? 'Provisioning' :
 errorCode === 'dns_propagating' ? 'DNS Propagating' :
 errorCode === '403_cloudflare' ? '403 CF Block' :
 errorCode === '403' ? '403 Forbidden' :
 errorCode === '522' ? 'Timeout' :
 errorCode === '523' ? 'Unreachable' :
 errorCode === 'redirect_loop' ? 'Redirect Loop' :
 'Issue Detected';
 return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{label}</Badge>;
}

export default function AdminCustomDomains() {
 
 const queryClient = useQueryClient();
 const [search, setSearch] = useState('');
 const [runningHealthCheck, setRunningHealthCheck] = useState<string | null>(null);
 const [fixingHostname, setFixingHostname] = useState<string | null>(null);

 const { data: domains, isLoading } = useQuery({
 queryKey: ['admin-custom-domains'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('store_domains')
 .select('*, stores!inner(name, slug, owner_id)')
 .order('created_at', { ascending: false });
 if (error) throw error;
 return data;
 },
 });

 const healthCheckMutation = useMutation({
 mutationFn: async (domainId: string) => {
 setRunningHealthCheck(domainId);
 const { data, error } = await supabase.functions.invoke('store-domain-manager', {
 body: { action: 'admin-health-check', domain_id: domainId },
 });
 if (error) throw error;
 return data;
 },
 onSuccess: (data, domainId) => {
 queryClient.invalidateQueries({ queryKey: ['admin-custom-domains'] });
 const isOk = !data.error_code && data.http_reachable;
 if (isOk) {
 toast.success('Domain is healthy', { description: data.diagnosis || 'Health check complete' });
 } else {
 toast.error(`Issue: ${data.error_code || 'unknown'}`, { description: data.diagnosis || 'Health check complete' });
 }
 },
 onError: (err: Error) => {
 toast.error('Health check failed', { description: err.message });
 },
 onSettled: () => setRunningHealthCheck(null),
 });

 const fixHostnameMutation = useMutation({
 mutationFn: async (domainId: string) => {
 setFixingHostname(domainId);
 const { data, error } = await supabase.functions.invoke('store-domain-manager', {
 body: { action: 'admin-fix-hostname', domain_id: domainId },
 });
 if (error) throw error;
 return data;
 },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ['admin-custom-domains'] });
 // Fix hostname completed
 const fixes = data.fixes?.length ?? 0;
 const errs = data.errors?.length ?? 0;
 const fixList = (data.fixes ?? []).join('; ');
 if (errs > 0) {
 toast.warning(`Fix completed with ${errs} error(s)`, { description: fixList || 'Check console for details.' });
 } else {
 toast.success(`${fixes} fix(es) applied`, { description: fixList || 'DNS may take 2-5 min to propagate.' });
 }
 },
 onError: (err: Error) => {
 toast.error('Fix hostname failed', { description: err.message });
 },
 onSettled: () => setFixingHostname(null),
 });

 const filtered = (domains ?? []).filter(d => {
 if (!search) return true;
 const q = search.toLowerCase();
 return d.domain.toLowerCase().includes(q) ||
 (d.stores as any)?.name?.toLowerCase().includes(q) ||
 (d.stores as any)?.slug?.toLowerCase().includes(q);
 });

 const stats = {
 total: domains?.length ?? 0,
 active: domains?.filter(d => d.status === 'active').length ?? 0,
 cloudflare: domains?.filter(d => d.is_cloudflare_zone).length ?? 0,
 issues: domains?.filter(d => {
 const hc = d.last_health_check as any;
 return hc?.error_code;
 }).length ?? 0,
 };

 return (
 <AdminLayout>
 <div className="space-y-4">
 {/* Stats */}
 <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2">
 <Globe className="h-4 w-4 text-muted-foreground" />
 <div>
 <p className="text-2xl font-bold">{stats.total}</p>
 <p className="text-xs text-muted-foreground">Total Domains</p>
 </div>
 </div>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2">
 <CheckCircle className="h-4 w-4 text-emerald-500" />
 <div>
 <p className="text-2xl font-bold">{stats.active}</p>
 <p className="text-xs text-muted-foreground">Active</p>
 </div>
 </div>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2">
 <Cloud className="h-4 w-4 text-amber-500" />
 <div>
 <p className="text-2xl font-bold">{stats.cloudflare}</p>
 <p className="text-xs text-muted-foreground">On Cloudflare</p>
 </div>
 </div>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden min-w-[160px] flex-shrink-0 md:min-w-0">
 <div className="p-4 p-4">
 <div className="flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-destructive" />
 <div>
 <p className="text-2xl font-bold">{stats.issues}</p>
 <p className="text-xs text-muted-foreground">With Issues</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Search & Actions */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <div className="flex items-center justify-between flex-wrap gap-2">
 <div>
 <h3 className="font-semibold text-sm text-lg">All Custom Domains</h3>
 <p className="text-xs text-muted-foreground mt-0.5">Monitor and manage seller custom domains</p>
 </div>
 <Button
 variant="outline"
 size="sm"
 disabled={!domains?.length}
 onClick={() => {
 // Run health checks on all domains with issues or no check
 const toCheck = (domains ?? []).filter(d =>
 d.domain_type === 'custom' && (
 !d.last_health_check ||
 (d.last_health_check as any)?.error_code
 )
 );
 toCheck.forEach(d => healthCheckMutation.mutate(d.id));
 }}
 >
 <Activity className="h-3.5 w-3.5 mr-1.5" />
 Check All
 </Button>
 </div>
 <div className="relative mt-2">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder="Search domains or store names..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="pl-9"
 />
 </div>
 </div>
 <div className="p-4 p-0">
 {isLoading ? (
 <div className="p-4 space-y-3">
 {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
 </div>
 ) : filtered.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground">
 <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
 <p>No custom domains found</p>
 </div>
 ) : (
 <>
 {/* Desktop table */}
 <div className="hidden md:block overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Domain</TableHead>
 <TableHead>Store</TableHead>
 <TableHead>Type</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>SSL</TableHead>
 <TableHead>Health</TableHead>
 <TableHead>CF Zone</TableHead>
 <TableHead>Last Check</TableHead>
 <TableHead className="text-right">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map(domain => {
 const store = domain.stores as any;
 const hc = domain.last_health_check as any;
 return (
 <TableRow key={domain.id}>
 <TableCell>
 <div className="flex items-center gap-1.5">
 <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
 <a
 href={`https://${domain.domain}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm font-medium hover:underline flex items-center gap-1"
 >
 {domain.domain}
 <ExternalLink className="h-3 w-3 opacity-50" />
 </a>
 </div>
 {domain.is_primary && (
 <Badge variant="outline" className="mt-0.5 text-[10px] px-1 py-0">Primary</Badge>
 )}
 </TableCell>
 <TableCell>
 <span className="text-sm">{store?.name ?? 'Unknown'}</span>
 </TableCell>
 <TableCell>
 <Badge variant="secondary" className="text-[10px]">
 {domain.domain_type}
 </Badge>
 </TableCell>
 <TableCell><StatusBadge status={domain.status} /></TableCell>
 <TableCell><SslBadge status={domain.ssl_status} /></TableCell>
 <TableCell>
 <DomainHealthDisplay healthCheck={hc} domain={domain.domain} isCloudflare={domain.is_cloudflare_zone} compact />
 </TableCell>
 <TableCell>
 {domain.is_cloudflare_zone ? (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
 <Cloud className="h-3 w-3 mr-1" />CF
 </Badge>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 </TableCell>
 <TableCell>
 {domain.last_health_check_at ? (
 <span className="text-xs text-muted-foreground">
 {format(new Date(domain.last_health_check_at), 'dd MMM HH:mm')}
 </span>
 ) : (
 <span className="text-xs text-muted-foreground">Never</span>
 )}
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-1">
 <Button
 variant="ghost"
 size="sm"
 disabled={runningHealthCheck === domain.id}
 onClick={() => healthCheckMutation.mutate(domain.id)}
 title="Health Check"
 >
 <RefreshCw className={cn("h-3.5 w-3.5", runningHealthCheck === domain.id && "animate-spin")} />
 </Button>
 {domain.domain_type === 'custom' && (hc?.error_code || domain.ssl_status === 'pending') && (
 <Button
 variant="ghost"
 size="sm"
 disabled={fixingHostname === domain.id}
 onClick={() => fixHostnameMutation.mutate(domain.id)}
 title="Fix Hostname"
 >
 <Wrench className={cn("h-3.5 w-3.5 text-amber-500", fixingHostname === domain.id && "animate-spin")} />
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>

 {/* Mobile card layout */}
 <div className="md:hidden divide-y divide-border">
 {filtered.map(domain => {
 const store = domain.stores as any;
 const hc = domain.last_health_check as any;
 return (
 <div key={domain.id} className="p-4 space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <a
 href={`https://${domain.domain}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm font-medium hover:underline flex items-center gap-1"
 >
 <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
 <span className="truncate">{domain.domain}</span>
 <ExternalLink className="h-3 w-3 opacity-50 flex-shrink-0" />
 </a>
 <p className="text-xs text-muted-foreground mt-0.5">{store?.name ?? 'Unknown'}</p>
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 <Button
 variant="ghost"
 size="sm"
 className="h-8 w-8 p-0"
 disabled={runningHealthCheck === domain.id}
 onClick={() => healthCheckMutation.mutate(domain.id)}
 >
 <RefreshCw className={cn("h-3.5 w-3.5", runningHealthCheck === domain.id && "animate-spin")} />
 </Button>
 {domain.domain_type === 'custom' && (hc?.error_code || domain.ssl_status === 'pending') && (
 <Button
 variant="ghost"
 size="sm"
 className="h-8 w-8 p-0"
 disabled={fixingHostname === domain.id}
 onClick={() => fixHostnameMutation.mutate(domain.id)}
 >
 <Wrench className={cn("h-3.5 w-3.5 text-amber-500", fixingHostname === domain.id && "animate-spin")} />
 </Button>
 )}
 </div>
 </div>
 <div className="flex flex-wrap gap-1.5">
 <Badge variant="secondary" className="text-[10px]">{domain.domain_type}</Badge>
 <StatusBadge status={domain.status} />
 <SslBadge status={domain.ssl_status} />
 <HealthBadge healthCheck={hc} />
 {domain.is_cloudflare_zone && (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
 <Cloud className="h-3 w-3 mr-1" />CF
 </Badge>
 )}
 </div>
 {domain.last_health_check_at && (
 <p className="text-[10px] text-muted-foreground">
 Last check: {format(new Date(domain.last_health_check_at), 'dd MMM HH:mm')}
 </p>
 )}
 </div>
 );
 })}
 </div>
 </>
 )}
 </div>
 </div>

 {/* Domains with issues detail */}
 {filtered.some(d => (d.last_health_check as any)?.error_code) && (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-destructive" />
 Domains with Issues ({filtered.filter(d => (d.last_health_check as any)?.error_code).length})
 </h3>
 </div>
 <div className="p-4 space-y-4">
 {filtered
 .filter(d => (d.last_health_check as any)?.error_code)
 .map(domain => {
 const hc = domain.last_health_check as any;
 return (
 <div key={domain.id} className="space-y-2">
 <div className="flex items-center gap-2">
 <Globe className="h-3.5 w-3.5 text-muted-foreground" />
 <span className="text-sm font-medium">{domain.domain}</span>
 <span className="text-xs text-muted-foreground">— {(domain.stores as any)?.name}</span>
 </div>
 <DomainHealthDisplay
 healthCheck={hc}
 domain={domain.domain}
 isCloudflare={domain.is_cloudflare_zone}
 />
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 </AdminLayout>
 );
}
