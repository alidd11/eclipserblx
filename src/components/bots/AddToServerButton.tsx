import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, ExternalLink, Loader2, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { openExternalUrl } from '@/lib/externalBrowser';

interface AddToServerButtonProps {
  installationCodeId: string;
  productName: string;
  isActivated: boolean;
  guildName?: string | null;
  guildIcon?: string | null;
  userId: string;
  className?: string;
}

export function AddToServerButton({
  installationCodeId,
  productName,
  isActivated,
  guildName,
  guildIcon,
  userId,
  className,
}: AddToServerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToServer = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-bot-license', {
        body: {
          installationCodeId,
          userId,
        },
      });

      if (error) throw error;

      if (data?.alreadyActivated) {
        toast.info('This license has already been activated');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.oauthUrl) {
        // Redirect to Discord OAuth - opens in default browser on PWA/native
        await openExternalUrl(data.oauthUrl);
      }
    } catch (err: unknown) {
      console.error('Failed to generate invite URL:', err);
      toast.error('Failed to generate invite link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isActivated) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
          {guildIcon ? (
            <img src={guildIcon} alt={guildName || 'Server'} className="w-5 h-5 rounded-full" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-500">
              {guildName || 'Bot Active'}
            </span>
            <span className="text-xs text-green-400/70">Installed & Running</span>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-primary/30 text-primary hover:bg-primary/10"
        >
          <Link to={`/bot-dashboard?code=${installationCodeId}`}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Bot
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleAddToServer}
      disabled={isLoading}
      className={`gradient-button border-0 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <Bot className="h-4 w-4 mr-2" />
          Add to Server
          <ExternalLink className="h-3 w-3 ml-2" />
        </>
      )}
    </Button>
  );
}
