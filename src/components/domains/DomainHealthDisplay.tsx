import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle, XCircle, AlertTriangle, Cloud, ChevronDown, ChevronUp,
  Copy, ExternalLink, Info, Wrench, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ExpectedDnsRecord {
  type: string;
  name: string;
  content: string;
  proxied: boolean;
}

interface ObservedDnsRecord {
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  source: string;
}

interface HealthData {
  error_code?: string | null;
  http_reachable?: boolean;
  diagnosis?: string;
  recommended_fix?: string;
  is_cloudflare_zone?: boolean;
  expected_dns_records?: ExpectedDnsRecord[];
  observed_dns_records?: ObservedDnsRecord[];
  [key: string]: any;
}

interface DomainHealthDisplayProps {
  healthCheck: HealthData | null;
  domain?: string;
  isCloudflare?: boolean;
  /** Compact mode for table rows / admin views */
  compact?: boolean;
  /** Callback when the auto-fix button is clicked */
  onAutoFix?: () => void;
  /** Whether auto-fix is currently running */
  isAutoFixing?: boolean;
  /** Whether the seller has saved Cloudflare credentials */
  hasCloudflareCredentials?: boolean;
}

const ERROR_INFO: Record<string, {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  summary: string;
  steps: string[];
  icon: 'dns' | 'proxy' | 'block' | 'timeout';
}> = {
  proxied_cname: {
    severity: 'critical',
    title: 'CNAME is Proxied (Orange Cloud)',
    summary: 'Your CNAME is set to Proxied mode which causes cross-zone conflicts.',
    steps: [
      'Go to your DNS provider dashboard (e.g. Cloudflare)',
      'Find the CNAME record for your domain',
      'Click the orange cloud icon to switch to DNS-only (grey cloud)',
      'Wait 2–5 minutes and run the health check again',
    ],
    icon: 'proxy',
  },
  cf_zone_proxied: {
    severity: 'critical',
    title: 'Error 1000: Cloudflare Proxy Conflict',
    summary: 'Your domain is on its own Cloudflare zone with proxy enabled (orange cloud). This creates a cross-zone conflict. You must switch to DNS-only (grey cloud) in YOUR Cloudflare dashboard.',
    steps: [
      'Log in to YOUR Cloudflare dashboard (the one managing your domain)',
      'Go to DNS → Records',
      'Find the A or CNAME record for your root domain (@)',
      'Change the A record value to 185.158.133.1',
      'Click the orange cloud icon to switch it to grey (DNS-only)',
      'Delete any AAAA (IPv6) records for your root domain',
      'If you have a www record, also set it to DNS-only pointing to 185.158.133.1',
      'Wait 2–5 minutes for propagation, then re-run the health check',
    ],
    icon: 'dns',
  },
  '1000': {
    severity: 'critical',
    title: 'Error 1000: DNS Conflict',
    summary: 'Your domain\'s DNS is conflicting with the platform\'s Cloudflare setup (cross-zone issue).',
    steps: [], // Dynamically generated from expected_dns_records
    icon: 'dns',
  },
  '1000_non_cf': {
    severity: 'critical',
    title: 'Error 1000: CNAME Conflict',
    summary: 'Your CNAME is causing a DNS conflict. This happens when it points to a Cloudflare-protected domain.',
    steps: [], // Dynamically generated from expected_dns_records
    icon: 'dns',
  },
  '1014': {
    severity: 'critical',
    title: 'Error 1014: Cross-User Banned',
    summary: 'Your CNAME is Proxied (orange cloud) which triggers Cloudflare\'s cross-user protection.',
    steps: [
      'Open your Cloudflare dashboard',
      'Navigate to DNS → Records',
      'Click the orange cloud icon on your CNAME to make it grey (DNS-only)',
      'Re-run the health check',
    ],
    icon: 'proxy',
  },
  '403_cloudflare': {
    severity: 'critical',
    title: '403: Cloudflare Blocking',
    summary: 'Cloudflare is blocking requests to your domain. This can happen if the CNAME is proxied (orange cloud) or the custom hostname isn\'t active yet.',
    steps: [
      'Ensure your CNAME is set to DNS-only (grey cloud)',
      'If already DNS-only, wait 5-10 minutes — the custom hostname may still be provisioning',
      'Re-run the health check after waiting',
      'If the issue persists, try removing and re-adding your custom domain, or check WAF/Bot Fight Mode settings',
    ],
    icon: 'block',
  },
  '403_direct_a': {
    severity: 'warning',
    title: '403: Wrong DNS Record Type',
    summary: 'Your A record points directly to the origin, bypassing the proxy. The server can\'t route your domain.',
    steps: [], // Dynamically generated from expected_dns_records
    icon: 'dns',
  },
  '403': {
    severity: 'warning',
    title: '403: Access Forbidden',
    summary: 'Requests to this domain are being blocked.',
    steps: [
      'Check your domain\'s WAF rules and Bot Fight Mode',
      'If using Cloudflare, ensure CNAME is DNS-only (grey cloud)',
      'Review any firewall or access rules that may block traffic',
    ],
    icon: 'block',
  },
  '522': {
    severity: 'warning',
    title: 'Error 522: Connection Timed Out',
    summary: 'The origin server didn\'t respond in time.',
    steps: [
      'Verify DNS points to stores.eclipserblx.com (CNAME) or 185.158.133.1 (A record)',
      'Wait a few minutes and try again — this can be temporary',
      'If persistent, contact support',
    ],
    icon: 'timeout',
  },
  '523': {
    severity: 'warning',
    title: 'Error 523: Origin Unreachable',
    summary: 'The origin server could not be reached at all.',
    steps: [
      'Verify your CNAME points to stores.eclipserblx.com',
      'Ensure the record is DNS-only (grey cloud)',
      'Contact support if the issue persists',
    ],
    icon: 'timeout',
  },
  redirect_loop: {
    severity: 'warning',
    title: 'Redirect Loop Detected',
    summary: 'The domain is caught in an infinite redirect cycle.',
    steps: [
      'Check for conflicting redirect rules in your DNS provider',
      'Disable "Always Use HTTPS" or any Page Rules for this domain',
      'Remove any Cloudflare Workers routes matching this domain',
    ],
    icon: 'proxy',
  },
  hostname_provisioning: {
    severity: 'info',
    title: 'Hostname Still Provisioning',
    summary: 'Your custom hostname/SSL is still initializing. Temporary 403 or Error 1000 is expected during this stage.',
    steps: [
      'Wait 5–15 minutes for Cloudflare custom hostname + SSL provisioning to complete',
      'Do not run Auto-Fix repeatedly during this wait period',
      'Run Health Check again once provisioning has had time to complete',
    ],
    icon: 'timeout',
  },
  dns_propagating: {
    severity: 'info',
    title: 'DNS Is Still Propagating',
    summary: 'Some DNS resolvers still have old records or NXDOMAIN cache after recent DNS changes.',
    steps: [
      'Wait 5–15 minutes for DNS propagation',
      'Avoid changing records again until propagation settles',
      'Re-run the health check after waiting',
    ],
    icon: 'dns',
  },
};

function copyText(text: string) {
  copyToClipboard(text);
}

function SeverityIcon({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  if (severity === 'critical') return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
  if (severity === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
  return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
}

const FIXABLE_ERRORS = ['1000', '1014', 'proxied_cname', '403_direct_a', '403_cloudflare', '1000_non_cf', 'cf_zone_proxied'];

/** Generate dynamic fix steps from expected_dns_records */
function getDynamicSteps(errorCode: string, expectedRecords?: ExpectedDnsRecord[]): string[] {
  if (!expectedRecords || expectedRecords.length === 0) {
    // Fallback generic steps
    if (errorCode === '1000' || errorCode === '1000_non_cf') {
      return [
        'Check your DNS records at your provider',
        'Ensure records match the expected configuration shown above',
        'Set all records to DNS-only (grey cloud) if using Cloudflare',
        'Wait 2–5 minutes and run the health check again',
      ];
    }
    return [];
  }

  const steps: string[] = [];
  steps.push('Remove any existing A, AAAA, or conflicting CNAME records for your domain');
  
  for (const rec of expectedRecords) {
    if (rec.type === 'CNAME') {
      steps.push(`Create a CNAME record: ${rec.name} → ${rec.content} (DNS-only, grey cloud)`);
    } else if (rec.type === 'A') {
      steps.push(`Create an A record: ${rec.name} → ${rec.content} (DNS-only)`);
    }
  }
  
  steps.push('Set all records to DNS-only (grey cloud) — NOT Proxied (orange cloud)');
  steps.push('Wait 2–5 minutes and run the health check again');
  
  return steps;
}

/** Full health display card — used on seller settings page */
export function DomainHealthDisplay({ healthCheck, domain, isCloudflare, compact, onAutoFix, isAutoFixing, hasCloudflareCredentials }: DomainHealthDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!healthCheck) return null;

  const isOk = !healthCheck.error_code && healthCheck.http_reachable;
  const rawErrorInfo = healthCheck.error_code ? ERROR_INFO[healthCheck.error_code] : null;
  const cfDetected = isCloudflare || healthCheck.is_cloudflare_zone;

  // Build errorInfo with dynamic steps if needed
  const errorInfo = rawErrorInfo ? {
    ...rawErrorInfo,
    steps: rawErrorInfo.steps.length > 0 
      ? rawErrorInfo.steps 
      : getDynamicSteps(healthCheck.error_code!, healthCheck.expected_dns_records),
  } : null;

  // ── Healthy state ──
  if (isOk) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2",
        compact && "py-1.5 px-2"
      )}>
        <CheckCircle className={cn("text-emerald-500 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <p className={cn("text-emerald-600 dark:text-emerald-400 font-medium", compact ? "text-xs" : "text-sm")}>
          Domain is healthy
        </p>
        {healthCheck.diagnosis && !compact && (
          <span className="text-xs text-muted-foreground ml-auto">{healthCheck.diagnosis}</span>
        )}
      </div>
    );
  }

  // ── Error state — compact (admin table) ──
  if (compact && errorInfo) {
    return (
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1.5 text-left group w-full">
            <SeverityIcon severity={errorInfo.severity} />
            <span className="text-xs font-medium truncate">{errorInfo.title}</span>
            {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2 pl-6">
            <p className="text-xs text-muted-foreground">{errorInfo.summary}</p>
            <ol className="list-decimal list-inside space-y-0.5">
              {errorInfo.steps.map((step, i) => (
                <li key={i} className="text-xs text-muted-foreground">{step}</li>
              ))}
            </ol>
            {cfDetected && (
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <Cloud className="h-3 w-3" />
                <span>Cloudflare zone detected</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // ── Error state — full (seller page) ──
  if (errorInfo) {
    return (
      <div className={cn(
        "rounded-lg border overflow-hidden",
        errorInfo.severity === 'critical'
          ? "border-destructive/30 bg-destructive/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}>
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <SeverityIcon severity={errorInfo.severity} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                "text-sm font-semibold",
                errorInfo.severity === 'critical' ? "text-destructive" : "text-amber-600 dark:text-amber-400"
              )}>
                {errorInfo.title}
              </h4>
              {cfDetected && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                  <Cloud className="w-3 h-3 mr-1" />Cloudflare
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{errorInfo.summary}</p>
          </div>
        </div>

        {/* Fix steps */}
        <div className="border-t border-border/50 bg-background/50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">How to fix</span>
          </div>
          <ol className="space-y-2">
            {errorInfo.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className={cn(
                  "flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5",
                  "bg-primary/10 text-primary"
                )}>
                  {i + 1}
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Quick copy helpers — dynamic from expected records */}
          {domain && healthCheck.expected_dns_records && healthCheck.expected_dns_records.length > 0 && (healthCheck.error_code === '1000' || healthCheck.error_code === '1000_non_cf' || healthCheck.error_code === '403_direct_a') && (
            <div className="mt-3 flex flex-wrap gap-2">
              {healthCheck.expected_dns_records.map((rec: { type: string; content: string; name: string }, i: number) => (
                <Button key={i} variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText(rec.content)}>
                  <Copy className="h-3 w-3 mr-1" />{rec.type}: {rec.content}
                </Button>
              ))}
            </div>
          )}
          {/* Fallback copy helpers if no expected records */}
          {domain && (!healthCheck.expected_dns_records || healthCheck.expected_dns_records.length === 0) && (healthCheck.error_code === '1000' || healthCheck.error_code === '1000_non_cf' || healthCheck.error_code === '403_direct_a') && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => copyText('stores.eclipserblx.com')}>
                <Copy className="h-3 w-3 mr-1" />CNAME target
              </Button>
            </div>
          )}

          {/* Auto-Fix button */}
          {onAutoFix && hasCloudflareCredentials && healthCheck.error_code && FIXABLE_ERRORS.includes(healthCheck.error_code) && (
            <div className="border-t border-border/50 bg-primary/5 p-4">
              <Button
                onClick={onAutoFix}
                disabled={isAutoFixing}
                size="sm"
                className="w-full"
              >
                {isAutoFixing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fixing DNS…
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Auto-Fix DNS via Cloudflare API
                  </>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                Uses your saved Cloudflare token to correct DNS records automatically
              </p>
            </div>
          )}
        </div>

        {/* Raw diagnosis (collapsible) */}
        {healthCheck.diagnosis && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center gap-1.5 px-4 py-2 border-t border-border/50 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3 w-3" />
                <span>Technical details</span>
                <ChevronDown className="h-3 w-3 ml-auto" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-3 text-xs text-muted-foreground font-mono bg-muted/30 mx-4 mb-3 rounded p-2">
                {healthCheck.diagnosis}
                {healthCheck.recommended_fix && (
                  <p className="mt-1 text-foreground/70">Recommended: {healthCheck.recommended_fix}</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // ── Unknown error ──
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">
          {healthCheck.diagnosis || 'Could not determine domain status.'}
        </p>
        {healthCheck.recommended_fix && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">Fix: {healthCheck.recommended_fix}</p>
        )}
      </div>
    </div>
  );
}
