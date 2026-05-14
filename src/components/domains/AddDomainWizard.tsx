import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Globe, Link, RefreshCw, CheckCircle, CheckCircle2, XCircle,
  AlertTriangle, Copy, Trash2, Cloud, ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DnsRecordRow } from './DnsRecordRow';
import { errMsg } from '@/lib/errors';

interface PreCheckResult {
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
}

interface AddDomainWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreCheck: (domain: string) => Promise<PreCheckResult>;
  onConnect: (domain: string) => void;
  isConnecting: boolean;
}

type Step = 'input' | 'checking' | 'issues' | 'ready';

export function AddDomainWizard({ open, onOpenChange, onPreCheck, onConnect, isConnecting }: AddDomainWizardProps) {
  const [domain, setDomain] = useState('');
  const [step, setStep] = useState<Step>('input');
  const [preCheck, setPreCheck] = useState<PreCheckResult | null>(null);
  const [recheckLoading, setRecheckLoading] = useState(false);

  const reset = () => {
    setDomain('');
    setStep('input');
    setPreCheck(null);
  };

  const handleCheck = useCallback(async () => {
    const d = domain.trim().toLowerCase();
    if (!d) return;
    setStep('checking');
    try {
      const data = await onPreCheck(d);
      setPreCheck(data);
      if (data?.has_proxied_records || data?.has_conflicting_records) {
        setStep('issues');
      } else {
        setStep('ready');
      }
    } catch {
      // Pre-check failed — allow to proceed anyway
      setStep('ready');
    }
  }, [domain, onPreCheck]);

  const handleRecheck = useCallback(async () => {
    if (!preCheck?.domain) return;
    setRecheckLoading(true);
    try {
      const data = await onPreCheck(preCheck.domain);
      setPreCheck(data);
      if (!data?.has_proxied_records && !data?.has_conflicting_records) {
        setStep('ready');
        toast.success('DNS looks good!');
      } else {
        toast.error('Issues still detected');
      }
    } catch (e) {
      toast.error('Re-check failed', { description: errMsg(e) });
    } finally {
      setRecheckLoading(false);
    }
  }, [preCheck?.domain, onPreCheck]);

  const handleConnect = () => {
    onConnect(preCheck?.domain ?? domain.trim().toLowerCase());
    reset();
    onOpenChange(false);
  };

  const stepIndex = step === 'input' ? 0 : step === 'checking' ? 1 : step === 'issues' ? 2 : 3;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Connect Custom Domain
          </SheetTitle>
          <SheetDescription>
            Point your own domain to your Eclipse store for a fully branded experience.
          </SheetDescription>
        </SheetHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-0 mb-6">
          {['Enter Domain', 'Pre-Check', 'Fix Issues', 'Connect'].map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  i < stepIndex ? 'bg-emerald-500 border-emerald-500 text-foreground' :
                  i === stepIndex ? 'bg-primary border-primary text-primary-foreground' :
                  'bg-background border-border text-muted-foreground'
                )}>
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  i <= stepIndex ? 'text-foreground' : 'text-muted-foreground/50'
                )}>
                  {label}
                </span>
              </div>
              {i < 3 && <div className={cn('h-px flex-1 mx-1 mt-[-14px]', i < stepIndex ? 'bg-emerald-500' : 'bg-border')} />}
            </div>
          ))}
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Domain name</label>
              <Input
                placeholder="mystore.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter your root domain without https:// or www
              </p>
            </div>

            <Button onClick={handleCheck} disabled={!domain.trim()} className="w-full">
              <Link className="w-4 h-4 mr-2" />
              Check Domain
            </Button>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                Need a domain?
              </p>
              <p className="text-xs text-muted-foreground">
                Buy one at cost from{' '}
                <a href="https://www.cloudflare.com/products/registrar/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Cloudflare Registrar</a>{' '}
                (from ~$8/year) or{' '}
                <a href="https://www.namecheap.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Namecheap</a>.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Checking */}
        {step === 'checking' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Checking DNS records for <strong className="text-foreground">{domain}</strong>…</p>
          </div>
        )}

        {/* Step 3: Issues */}
        {step === 'issues' && preCheck && (
          <div className="space-y-4">
            {preCheck.warnings.length > 0 && preCheck.warnings.map((w, i) => (
              <div key={i} className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                <p className="text-xs text-destructive">{w}</p>
              </div>
            ))}

            {preCheck.records_to_remove.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  Records to Remove
                </p>
                {preCheck.records_to_remove.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/10 p-2.5">
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {r.type}: <code className="bg-muted px-1 rounded">{r.name}</code> → <code className="bg-muted px-1 rounded break-all">{r.content}</code>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {preCheck.records_to_add.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Records to Add
                </p>
                {preCheck.records_to_add.map((r, i) => (
                  <DnsRecordRow key={i} type={r.type} name={r.name} value={r.content} note={r.note} proxied={r.proxied} />
                ))}
              </div>
            )}

            {preCheck.is_cloudflare && (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-xs text-amber-600 dark:text-amber-400">Cloudflare cross-zone conflict</AlertTitle>
                <AlertDescription className="text-[11px] text-muted-foreground">
                  Both your domain and Eclipse use Cloudflare. Set all records to <strong className="text-foreground">DNS-only (grey cloud)</strong> to prevent Error 1000.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => { reset(); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleRecheck} disabled={recheckLoading} className="flex-1">
                {recheckLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Re-check DNS
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Ready */}
        {step === 'ready' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Ready to connect</p>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{preCheck?.domain ?? domain.trim()}</strong> passed pre-checks and is ready to be connected.
              </p>
            </div>

            {preCheck?.is_cloudflare && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <Cloud className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Cloudflare zone detected. Ensure all records are <strong className="text-foreground">DNS-only</strong> after connecting.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">After connecting, add these DNS records:</p>
              <DnsRecordRow type="CNAME" name={preCheck?.domain ?? domain.trim()} value="stores.eclipserblx.com" proxied={false} />
              <DnsRecordRow type="CNAME" name={`www.${preCheck?.domain ?? domain.trim()}`} value="stores.eclipserblx.com" proxied={false} />
            </div>

            <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
              {isConnecting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Connect Domain
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
