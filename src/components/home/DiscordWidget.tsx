import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';

export function DiscordWidget() {
  const { resolvedTheme } = useTheme();

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

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 h-full">
        <Skeleton className="w-full h-[400px] rounded-lg" />
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
          height="400"
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
