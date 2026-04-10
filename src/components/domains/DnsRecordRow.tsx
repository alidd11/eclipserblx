import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DnsRecordRowProps {
  type: string;
  name: string;
  value: string;
  note?: string;
  proxied?: boolean;
}

export function DnsRecordRow({ type, name, value, note, proxied }: DnsRecordRowProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-[60px_1fr_1fr_36px] sm:grid-cols-[72px_1fr_1fr_36px] items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
      <span className="text-xs font-bold text-primary bg-primary/10 rounded px-2 py-0.5 text-center">
        {type}
      </span>
      <code className="text-xs font-mono text-foreground truncate">{name}</code>
      <code className="text-xs font-mono text-muted-foreground truncate">{value}</code>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
      {note && (
        <p className="col-span-4 text-[10px] text-muted-foreground pl-[72px] -mt-1">{note}{proxied === false && ' — DNS-only (grey cloud)'}</p>
      )}
    </div>
  );
}
