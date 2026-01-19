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
      
      const val = typeof data.value === 'string' ? data.value.replace(/^"|"$/g, '') : data.value;
      return String(val);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden">
        <Skeleton className="w-full h-[400px] md:h-[500px]" />
      </div>
    );
  }

  if (!serverId) {
    return null;
  }

  const theme = resolvedTheme === 'light' ? 'light' : 'dark';

  return (
    <div className="rounded-lg overflow-hidden w-full max-w-[350px]">
      <iframe
        src={`https://discord.com/widget?id=${serverId}&theme=${theme}`}
        width="350"
        height="500"
        allowTransparency={true}
        frameBorder={0}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        className="w-full"
        title="Discord Widget"
      />
    </div>
  );
}
