import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';

export function DiscordWidget() {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();

  // Fetch server ID from settings
  const { data: serverId, isLoading } = useQuery({
    queryKey: ['discord-widget-server-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'discord_widget_server_id')
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return null;
      
      // Handle both string and JSON-encoded values, strip extra quotes
      let val = data.value;
      if (typeof val === 'string') {
        val = val.replace(/^"|"$/g, '');
      }
      return String(val);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const widgetHeight = isMobile ? 300 : 400;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 h-full">
        <Skeleton className={`w-full rounded-lg`} style={{ height: widgetHeight }} />
      </div>
    );
  }

  if (!serverId) {
    return null;
  }

  const theme = resolvedTheme === 'light' ? 'light' : 'dark';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 h-full">
      <div className="rounded-lg overflow-hidden">
        <iframe
          src={`https://discord.com/widget?id=${serverId}&theme=${theme}`}
          width="100%"
          height={widgetHeight}
          frameBorder={0}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          className="w-full"
          title="Discord Widget"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}
