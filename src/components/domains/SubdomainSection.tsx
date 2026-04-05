import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, RefreshCw, Zap } from 'lucide-react';

interface SubdomainSectionProps {
  subdomain: { id: string; domain: string; status: string } | undefined;
  storeSlug: string;
  onClaim: () => void;
  onRemove: (id: string) => void;
  isClaiming: boolean;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-500',
    pending: 'bg-amber-500',
    verifying: 'bg-blue-500',
    failed: 'bg-destructive',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? 'bg-muted-foreground'}`} />;
}

export function SubdomainSection({ subdomain, storeSlug, onClaim, onRemove, isClaiming }: SubdomainSectionProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Free Subdomain</h3>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Included
          </Badge>
        </div>
        {subdomain && (
          <div className="flex items-center gap-1.5">
            <StatusDot status={subdomain.status} />
            <span className="text-xs text-muted-foreground capitalize">{subdomain.status}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        {subdomain ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground">https://</span>
              <code className="text-sm font-mono font-medium text-foreground">{subdomain.domain}</code>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => window.open(`https://${subdomain.domain}`, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => onRemove(subdomain.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{storeSlug}.eclipserblx.com</p>
              <p className="text-xs text-muted-foreground mt-0.5">Free subdomain included with your store</p>
            </div>
            <Button onClick={onClaim} disabled={isClaiming} size="sm">
              {isClaiming ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Claim
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
