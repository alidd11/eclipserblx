import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { VerificationResults } from '@/hooks/useSellerVerification';
import type { SellerFormValues } from './StepDetails';

interface StepDiscordProps {
  formValues: SellerFormValues;
  setFormValues: (updates: Partial<SellerFormValues>) => void;
  onBlur: () => void;
  discordValidating: boolean;
  verificationResults: VerificationResults;
}

export function StepDiscord({ formValues, setFormValues, onBlur, discordValidating, verificationResults }: StepDiscordProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="discordInvite">Discord Server Invite Link *</Label>
        <div className="relative">
          <Input
            id="discordInvite"
            placeholder="https://discord.gg/your-server"
            value={formValues.discordServerInvite}
            onChange={(e) => setFormValues({ discordServerInvite: e.target.value })}
            onBlur={onBlur}
            className={cn(
              verificationResults.discord_server?.valid && 'border-green-500',
              verificationResults.discord_server?.error && 'border-destructive'
            )}
          />
          {discordValidating && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!discordValidating && verificationResults.discord_server?.valid && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">Must be a permanent invite (no expiration).</p>
      </div>

      {verificationResults.discord_server?.valid && verificationResults.discord_server?.guild_name && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium text-sm">{verificationResults.discord_server.guild_name}</span>
          </div>
          {verificationResults.discord_server.member_count && (
            <p className="text-xs text-muted-foreground pl-6">
              {verificationResults.discord_server.member_count.toLocaleString()} members
            </p>
          )}
          {verificationResults.discord_server.is_permanent && (
            <Badge variant="outline" className="text-xs ml-6">Permanent Invite ✓</Badge>
          )}
        </div>
      )}

      {verificationResults.discord_server?.error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          {verificationResults.discord_server.error}
        </p>
      )}
    </div>
  );
}
