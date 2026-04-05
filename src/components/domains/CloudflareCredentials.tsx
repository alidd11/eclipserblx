import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Key, CheckCircle, Trash2, RefreshCw, Eye, EyeOff, Shield, Info, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CloudflareCredentialsProps {
  storeId: string;
}

export function CloudflareCredentials({ storeId }: CloudflareCredentialsProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [zoneIdInput, setZoneIdInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: creds, isLoading } = useQuery({
    queryKey: ['cf-creds', storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('store_credentials')
        .select('cloudflare_api_token, cloudflare_zone_id')
        .eq('store_id', storeId)
        .single();
      return data;
    },
  });

  const hasToken = !!creds?.cloudflare_api_token;
  const hasZoneId = !!creds?.cloudflare_zone_id;
  const maskedToken = hasToken ? `••••••••${(creds.cloudflare_api_token as string).slice(-4)}` : '';

  const saveCreds = useMutation({
    mutationFn: async () => {
      const updates: Record<string, string> = {};
      if (tokenInput.trim()) updates.cloudflare_api_token = tokenInput.trim();
      if (zoneIdInput.trim()) updates.cloudflare_zone_id = zoneIdInput.trim();
      if (Object.keys(updates).length === 0) throw new Error('Enter at least one field');
      const { error } = await supabase.from('store_credentials').update(updates).eq('store_id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cf-creds'] });
      setTokenInput('');
      setZoneIdInput('');
      toast.success('Credentials saved');
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  const clearCreds = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('store_credentials').update({ cloudflare_api_token: null, cloudflare_zone_id: null }).eq('store_id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cf-creds'] });
      toast.success('Credentials removed');
    },
    onError: (e: any) => toast.error('Error', { description: e.message }),
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-4">
      {/* Status */}
      {hasToken && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <Key className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">API Token</p>
            <p className="text-sm font-mono text-foreground">{maskedToken}</p>
          </div>
          {hasZoneId && (
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Zone ID</p>
              <p className="text-sm font-mono text-foreground truncate">{creds.cloudflare_zone_id}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => clearCreds.mutate()} disabled={clearCreds.isPending}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )}

      {/* Guide */}
      <Collapsible open={guideOpen} onOpenChange={setGuideOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-primary hover:underline w-full text-left">
            <Info className="w-4 h-4 shrink-0" />
            How to create your Cloudflare API Token
            <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', guideOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Create your API Token:</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">dash.cloudflare.com → API Tokens</a></li>
                <li>Click <strong className="text-foreground">Create Token</strong></li>
                <li>Use the <strong className="text-foreground">"Edit zone DNS"</strong> template</li>
                <li>Scope to your specific zone</li>
                <li>Copy the token and paste below</li>
              </ol>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Find your Zone ID:</p>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">dash.cloudflare.com</a> → select domain</li>
                <li>Copy the <strong className="text-foreground">Zone ID</strong> from the right sidebar</li>
              </ol>
            </div>
            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertTitle className="text-sm">Minimum permissions</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Only <strong className="text-foreground">Zone:DNS:Edit</strong> scoped to your zone. No account-level access needed.
              </AlertDescription>
            </Alert>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Input Fields */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cf-token" className="text-xs">API Token {hasToken && '(leave blank to keep current)'}</Label>
          <div className="relative">
            <Input
              id="cf-token"
              type={showToken ? 'text' : 'password'}
              placeholder={hasToken ? '••••••••' : 'Paste API token'}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="pr-10"
            />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-zone" className="text-xs">Zone ID {hasZoneId && '(leave blank to keep current)'}</Label>
          <Input
            id="cf-zone"
            placeholder={hasZoneId ? creds.cloudflare_zone_id ?? '' : 'Paste Zone ID'}
            value={zoneIdInput}
            onChange={(e) => setZoneIdInput(e.target.value)}
          />
        </div>
        <Button onClick={() => saveCreds.mutate()} disabled={saveCreds.isPending || (!tokenInput.trim() && !zoneIdInput.trim())} size="sm">
          {saveCreds.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
          {hasToken ? 'Update' : 'Save'} Credentials
        </Button>
      </div>
    </div>
  );
}
