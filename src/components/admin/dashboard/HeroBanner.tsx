import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
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
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
      <span className="whitespace-nowrap">🕐 {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
      <span className="whitespace-nowrap">🇬🇧 {fmt('Europe/London')}</span>
      <span className="whitespace-nowrap">🇺🇸 {fmt('America/New_York')}</span>
      <span className="whitespace-nowrap">🇺🇸 {fmt('America/Los_Angeles')}</span>
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold leading-tight truncate">
          {getTimeBasedGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <Badge variant="default" className="gap-1 text-[10px] shrink-0">
          <Shield className="h-2.5 w-2.5" />
          Admin
        </Badge>
      </div>
      <TimezoneClock />
    </div>
  );
}
