import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle } from 'lucide-react';
import { formatRelative } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

const TYPE_STYLES: Record<string, string> = {
  order: 'text-primary bg-primary/10',
  review: 'text-warning bg-warning/10',
  payout: 'text-success bg-success/10',
  refund_request: 'text-destructive bg-destructive/10',
  moderation: 'text-warning bg-warning/10',
  leak_detected: 'text-destructive bg-destructive/10' };

export function NotificationCenter() {
  const { user } = useAuth();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['seller-notifications-center', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('seller_notifications')
        .select('id, type, title, message, action_url, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000 });

  const unreadCount = notifications?.filter(n => !n.read_at).length || 0;

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-base font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Activity
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </h3>
        <Link to="/seller/notifications" className="text-xs text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {isLoading ? (
              <div className="px-2">
                <CardLoadingSkeleton rows={4} />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-1">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={n.action_url || '#'}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-colors ease-emphasized hover:bg-muted/50',
                      !n.read_at && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('p-2 rounded-full shrink-0', TYPE_STYLES[n.type] || 'text-muted-foreground bg-muted')}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{n.title}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelative(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <CardEmptyState icon={CheckCircle} title="No activity yet" />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
