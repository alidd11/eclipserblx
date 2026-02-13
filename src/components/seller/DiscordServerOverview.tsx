import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Hash, Users, Megaphone, Bot } from 'lucide-react';

export function DiscordServerOverview() {
  const { store } = useSellerStatus();
  const isConnected = !!store?.credentials?.discord_guild_id;
  const hasWebhook = !!store?.credentials?.discord_webhook_url;
  const guildId = store?.credentials?.discord_guild_id;

  // Count announcements sent (from seller_transactions or similar — we'll use a simple count)
  const { data: stats } = useQuery({
    queryKey: ['discord-stats', store?.id],
    queryFn: async () => {
      // Just return connection status metrics for now
      return {
        botConnected: isConnected,
        webhookConfigured: hasWebhook,
        rolesConfigured: !!(store?.credentials?.product_drops_role_id || store?.credentials?.early_product_drops_role_id),
      };
    },
    enabled: !!store?.id,
  });

  const statItems = [
    {
      label: 'Portal Bot',
      value: isConnected ? 'Connected' : 'Not Connected',
      icon: Bot,
      status: isConnected,
    },
    {
      label: 'Webhook',
      value: hasWebhook ? 'Configured' : 'Not Set',
      icon: Megaphone,
      status: hasWebhook,
    },
    {
      label: 'Role Pings',
      value: stats?.rolesConfigured ? 'Configured' : 'Not Set',
      icon: Users,
      status: stats?.rolesConfigured,
    },
    {
      label: 'Guild ID',
      value: guildId ? guildId.slice(0, 8) + '...' : 'None',
      icon: Hash,
      status: !!guildId,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {item.status ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              )}
              <span className="text-xs font-medium truncate">{item.value}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
