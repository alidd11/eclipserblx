import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink, Trash2, RefreshCw, CheckCircle, Activity, Cloud,
  Copy, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { DomainStatusTimeline } from './DomainStatusTimeline';
import { DomainHealthDisplay } from './DomainHealthDisplay';
import { DnsRecordRow } from './DnsRecordRow';

interface CustomDomainCardProps {
  domain: any;
  onVerify: (id: string) => void;
  onHealthCheck: (id: string) => void;
  onRemove: (id: string) => void;
  onAutoFix: (id: string) => void;
  isVerifying: boolean;
  isHealthChecking: boolean;
  isAutoFixing: boolean;
  healthCheckData?: any;
  hasCloudflareCredentials: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    active: { className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Active' },
    pending: { className: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Pending' },
    verifying: { className: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Verifying' },
    failed: { className: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Failed' },
    removed: { className: 'bg-muted text-muted-foreground border-border', label: 'Removed' },
  };
  const v = variants[status] ?? variants.pending;
  return <Badge variant="outline" className={cn('text-[10px]', v.className)}>{v.label}</Badge>;
}

export function CustomDomainCard({
  domain: d,
  onVerify,
  onHealthCheck,
  onRemove,
  onAutoFix,
  isVerifying,
  isHealthChecking,
  isAutoFixing,
  healthCheckData,
  hasCloudflareCredentials,
}: CustomDomainCardProps) {
  const [dnsOpen, setDnsOpen] = useState(d.status !== 'active');
  const isCloudflare = !!d.is_cloudflare_zone;
  const lastHealthCheck = d.last_health_check;
  const isPending = d.status === 'pending' || d.status === 'verifying' || d.status === 'failed';

  const handleCopy = (text: string) => copyToClipboard(text);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <code className="font-mono text-sm font-medium text-foreground truncate">{d.domain}</code>
            {isCloudflare && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] shrink-0">
                <Cloud className="w-3 h-3 mr-1" />CF
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={d.status} />
            {d.ssl_status === 'active' && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                SSL ✓
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Timeline */}
        <DomainStatusTimeline status={d.status} sslStatus={d.ssl_status} />

        {/* Health Display */}
        {lastHealthCheck && (
          <DomainHealthDisplay
            healthCheck={lastHealthCheck}
            domain={d.domain}
            isCloudflare={isCloudflare}
            onAutoFix={() => onAutoFix(d.id)}
            isAutoFixing={isAutoFixing}
            hasCloudflareCredentials={hasCloudflareCredentials}
          />
        )}
        {healthCheckData && !lastHealthCheck && (
          <DomainHealthDisplay
            healthCheck={healthCheckData}
            domain={d.domain}
            isCloudflare={isCloudflare}
            onAutoFix={() => onAutoFix(d.id)}
            isAutoFixing={isAutoFixing}
            hasCloudflareCredentials={hasCloudflareCredentials}
          />
        )}

        {/* DNS Instructions (collapsible) */}
        {isPending && (
          <Collapsible open={dnsOpen} onOpenChange={setDnsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                DNS Setup Instructions
                <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', dnsOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 space-y-3">
                {/* DNS Record Table */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[60px_1fr_1fr_36px] sm:grid-cols-[72px_1fr_1fr_36px] px-3 py-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Type</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Name</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Value</span>
                    <span />
                  </div>
                  <DnsRecordRow type="CNAME" name={d.domain} value="stores.eclipserblx.com" note="Points to store edge router" proxied={false} />
                  <DnsRecordRow type="CNAME" name={`www.${d.domain}`} value="stores.eclipserblx.com" note="WWW redirect" proxied={false} />
                  <DnsRecordRow type="TXT" name={`_eclipsestore-verify.${d.domain}`} value={d.verification_token ?? '...'} note="Ownership verification" />
                </div>

                {isCloudflare && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                      <Cloud className="w-3.5 h-3.5" />
                      Cloudflare: Set ALL records to DNS-only (grey cloud)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Proxied (orange cloud) causes Error 1000/1014. Click the orange cloud icon next to each record to switch.
                    </p>
                  </div>
                )}

                {/* Copy all button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const records = [
                        `CNAME  ${d.domain}  →  stores.eclipserblx.com  (DNS-only)`,
                        `CNAME  www.${d.domain}  →  stores.eclipserblx.com  (DNS-only)`,
                        `TXT    _eclipsestore-verify.${d.domain}  →  ${d.verification_token ?? '...'}`,
                      ].join('\n');
                      copyToClipboard(records, 'All DNS records copied!');
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy All Records
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPending && (
            <Button size="sm" onClick={() => onVerify(d.id)} disabled={isVerifying}>
              {isVerifying ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
              Verify DNS
            </Button>
          )}
          {d.status === 'active' && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.open(`https://${d.domain}`, '_blank')}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Visit
              </Button>
              <Button variant="outline" size="sm" onClick={() => onHealthCheck(d.id)} disabled={isHealthChecking}>
                {isHealthChecking ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
                Health Check
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={() => onRemove(d.id)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
