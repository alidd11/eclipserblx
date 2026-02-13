import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ExternalLink, CheckCircle, XCircle, Loader2, Terminal, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const AVAILABLE_COMMANDS = [
  { name: '/retrieve', description: 'Download purchased products directly in Discord' },
  { name: '/link', description: 'Link Discord account to Eclipse Portal account' },
  { name: '/purchases', description: 'View purchase history for this store' },
  { name: '/profile', description: 'View Eclipse Portal profile and stats' },
  { name: '/store', description: 'View store information and browse products' },
  { name: '/getrole', description: 'Claim customer roles based on purchase history' },
];

export function AddPortalBotCard() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isConnected = !!store?.credentials?.discord_guild_id;
  const connectedGuildId = store?.credentials?.discord_guild_id;

  // Handle callback from Discord OAuth
  useEffect(() => {
    const connected = searchParams.get('connected');
    const guildName = searchParams.get('guild_name');
    const error = searchParams.get('error');

    if (connected === 'true') {
      toast.success(`Eclipse Portal Bot added to ${guildName || 'your server'}!`);
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
      // Clean up URL params
      searchParams.delete('connected');
      searchParams.delete('guild_name');
      setSearchParams(searchParams, { replace: true });
    } else if (error) {
      toast.error(error);
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleAddBot = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      const { data, error } = await supabase.functions.invoke('invite-portal-bot', {
        method: 'POST',
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectBot = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store found');

      // Clear guild ID from both tables
      const [storeRes, credRes] = await Promise.all([
        supabase.from('stores').update({ discord_guild_id: null }).eq('id', store.id),
        supabase.from('store_credentials').update({ discord_guild_id: null }).eq('store_id', store.id),
      ]);

      if (storeRes.error) throw storeRes.error;
      if (credRes.error) throw credRes.error;
    },
    onSuccess: () => {
      toast.success('Eclipse Portal Bot disconnected from your server');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect bot');
    },
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-[#5865F2]/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#5865F2]" />
                  Eclipse Portal Bot
                  {isConnected && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                      Connected
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Add the Eclipse Portal Bot to your Discord server so customers can download products, link accounts, and more
                </CardDescription>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Connection Status */}
            {isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Bot Connected</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      Guild ID: {connectedGuildId}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectBot.mutate()}
                  disabled={disconnectBot.isPending}
                  className="text-destructive hover:text-destructive shrink-0 self-start sm:self-auto"
                >
                  {disconnectBot.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="ml-1">Disconnect</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  Add the Eclipse Portal Bot to your server to enable slash commands for your customers.
                </div>
                <Button
                  onClick={handleAddBot}
                  disabled={isLoading}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Add to Server
                </Button>
              </div>
            )}

            {/* Available Commands */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Available Commands
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_COMMANDS.map((cmd) => (
                  <div
                    key={cmd.name}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/30"
                  >
                    <Badge variant="secondary" className="font-mono text-xs shrink-0">
                      {cmd.name}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{cmd.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
