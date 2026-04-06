import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

function TimezoneClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const fmt = (tz: string) =>
    now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
      <span className="whitespace-nowrap">{'\uD83D\uDD50'} {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      <span className="whitespace-nowrap">{'\uD83C\uDDEC\uD83C\uDDE7'} {fmt('Europe/London')}</span>
      <span className="whitespace-nowrap">{'\uD83C\uDDFA\uD83C\uDDF8'} {fmt('America/New_York')}</span>
      <span className="whitespace-nowrap">{'\uD83C\uDDFA\uD83C\uDDF8'} {fmt('America/Los_Angeles')}</span>
    </div>
  );
}

export function HeroBanner() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex items-center gap-3 max-w-lg">
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'User'} className="object-cover" />
        <AvatarFallback className="bg-muted text-lg font-bold">
          {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-display font-bold leading-tight">
            {getTimeBasedGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}!
          </h1>
          <Badge variant="default" className="gap-1 text-[10px]">
            <Shield className="h-2.5 w-2.5" />
            Admin
          </Badge>
        </div>
        <TimezoneClock />
      </div>
    </div>
  );
}
