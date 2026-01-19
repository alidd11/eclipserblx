import { useState, useEffect } from 'react';
import { Users, MessageCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDiscordUrl } from '@/hooks/useDiscordUrl';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DiscordWidgetData {
  id: string;
  name: string;
  instant_invite: string;
  presence_count: number;
  members: Array<{
    id: string;
    username: string;
    avatar_url: string;
    status: string;
  }>;
}

export function DiscordWidget() {
  const [widgetData, setWidgetData] = useState<DiscordWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { discordUrl } = useDiscordUrl();

  // Fetch server ID from settings
  const { data: serverId } = useQuery({
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

  useEffect(() => {
    if (!serverId) {
      setIsLoading(false);
      setError('No server ID configured');
      return;
    }

    const fetchWidgetData = async () => {
      try {
        const response = await fetch(
          `https://discord.com/api/guilds/${serverId}/widget.json`
        );
        
        if (!response.ok) {
          throw new Error('Widget not enabled or server not found');
        }
        
        const data = await response.json();
        setWidgetData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Discord widget:', err);
        setError('Unable to load Discord widget');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWidgetData();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchWidgetData, 60000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (isLoading) {
    return (
      <Card className="bg-[#5865F2]/10 border-[#5865F2]/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !widgetData) {
    return (
      <Card className="bg-[#5865F2]/10 border-[#5865F2]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Join our Discord</p>
                <p className="text-sm text-muted-foreground">Connect with the community</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              onClick={() => window.open(discordUrl, '_blank')}
            >
              Join
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get first 5 online members to display
  const displayMembers = widgetData.members?.slice(0, 5) || [];

  return (
    <Card className="bg-[#5865F2]/10 border-[#5865F2]/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{widgetData.name}</p>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-muted-foreground">
                  {widgetData.presence_count} Online
                </span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
            onClick={() => window.open(discordUrl, '_blank')}
          >
            Join
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {displayMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {displayMembers.map((member) => (
                <div
                  key={member.id}
                  className="relative"
                  title={member.username}
                >
                  <img
                    src={member.avatar_url}
                    alt={member.username}
                    className="h-8 w-8 rounded-full border-2 border-background"
                  />
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                      member.status === 'online'
                        ? 'bg-green-500'
                        : member.status === 'idle'
                        ? 'bg-yellow-500'
                        : member.status === 'dnd'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}
                  />
                </div>
              ))}
            </div>
            {widgetData.presence_count > 5 && (
              <span className="text-xs text-muted-foreground">
                +{widgetData.presence_count - 5} more online
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
