import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';

interface StepAccountsProps {
  hasDiscord: boolean;
  hasRoblox: boolean;
  discordUsername?: string | null;
  robloxUsername?: string | null;
}

export function StepAccounts({ hasDiscord, hasRoblox, discordUsername, robloxUsername }: StepAccountsProps) {
  const startDiscordLink = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('discord-auth-url', {
        body: { mode: 'link' },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem('discord_link_redirect', '/become-seller');
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error('Failed to start Discord linking');
    }
  };

  const startRobloxLink = () => {
    sessionStorage.setItem('roblox_link_redirect', '/become-seller');
    window.location.href = '/account?link=roblox';
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        To verify your identity and provide support, we need both accounts linked.
      </p>

      <div className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        hasDiscord ? 'border-green-500/30 bg-green-500/5' : 'border-border'
      )}>
        <div className="flex items-center gap-3">
          {hasDiscord ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Discord</p>
            <p className="text-xs text-muted-foreground">
              {hasDiscord ? discordUsername : 'Not linked yet'}
            </p>
          </div>
        </div>
        {!hasDiscord && (
          <Button size="sm" variant="outline" onClick={startDiscordLink}>
            Link
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      <div className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        hasRoblox ? 'border-green-500/30 bg-green-500/5' : 'border-border'
      )}>
        <div className="flex items-center gap-3">
          {hasRoblox ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-medium text-sm">Roblox</p>
            <p className="text-xs text-muted-foreground">
              {hasRoblox ? robloxUsername : 'Not linked yet'}
            </p>
          </div>
        </div>
        {!hasRoblox && (
          <Button size="sm" variant="outline" onClick={startRobloxLink}>
            Link
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {hasDiscord && hasRoblox && (
        <Alert className="bg-green-500/10 border-green-500/30">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            Both accounts linked! You're ready to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
