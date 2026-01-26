import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Mail,
  Calendar,
  ShoppingBag,
  CreditCard,
  Star,
  MessageSquare,
  Heart,
  Crown,
  Clock,
  Hash,
  AtSign,
  MapPin,
  Globe,
} from 'lucide-react';

interface CustomerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    customer_id: string | null;
    email: string | null;
    avatar_url: string | null;
    created_at: string;
    discord_id?: string | null;
    discord_username?: string | null;
    roblox_id?: string | null;
    roblox_username?: string | null;
  } | null;
}

export function CustomerProfileDialog({ open, onOpenChange, profile }: CustomerProfileDialogProps) {
  // Fetch orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch subscription
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['customer-subscription', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['customer-reviews', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch wishlist count
  const { data: wishlistCount, isLoading: wishlistLoading } = useQuery({
    queryKey: ['customer-wishlist-count', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return 0;
      const { count, error } = await supabase
        .from('wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch chat conversations count
  const { data: chatCount, isLoading: chatLoading } = useQuery({
    queryKey: ['customer-chats', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return 0;
      const { count, error } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch badges
  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ['customer-badges', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at, badges(name, icon, color)')
        .eq('user_id', profile.user_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch last known IP from audit logs
  const { data: lastIp } = useQuery({
    queryKey: ['customer-last-ip', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from('audit_logs')
        .select('ip_address, created_at')
        .eq('user_id', profile.user_id)
        .not('ip_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && open,
  });

  // Calculate stats
  const totalSpent = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
  const orderCount = orders?.length || 0;
  const avgRating = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10">
                {profile.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl truncate flex items-center gap-2">
                {profile.display_name || 'Unnamed User'}
                {subscription && (
                  <Crown className="h-5 w-5 text-amber-500" />
                )}
              </DialogTitle>
              {profile.username && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AtSign className="h-3 w-3" />
                  {profile.username}
                </p>
              )}
              <p className="text-xs font-mono text-primary mt-1">
                {profile.customer_id}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 pt-2 space-y-6">
            {/* Account Info */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Information
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <span className="font-medium truncate max-w-[180px]">{profile.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined
                  </span>
                  <span className="font-medium">{format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                </div>
                {profile.discord_username && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Discord
                    </span>
                    <span className="font-medium">{profile.discord_username}</span>
                  </div>
                )}
                {profile.roblox_username && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Roblox
                    </span>
                    <span className="font-medium">{profile.roblox_username}</span>
                  </div>
                )}
                {lastIp?.ip_address && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Last IP
                    </span>
                    <div className="text-right">
                      <span className="font-mono text-sm">{lastIp.ip_address}</span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(lastIp.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Subscription Status */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Subscription
              </h3>
              {subLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : subscription ? (
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">Eclipse+ Active</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Since {format(new Date(subscription.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Crown className="h-8 w-8 text-amber-500" />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  No active subscription
                </p>
              )}
            </section>

            <Separator />

            {/* Stats Overview */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Activity Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">{orderCount}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-emerald-500">${totalSpent.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-rose-500">{wishlistLoading ? '-' : wishlistCount}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3" /> Wishlist
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-blue-500">{chatLoading ? '-' : chatCount}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Support Chats
                  </p>
                </div>
              </div>
            </section>

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Reviews ({reviews.length}) • Avg: {avgRating}★
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {reviews.map((review) => (
                      <Badge key={review.id} variant="outline" className="text-xs">
                        {review.rating}★ • {format(new Date(review.created_at), 'MMM d')}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Badges */}
            {badges && badges.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    Badges ({badges.length})
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {badges.map((ub: any) => (
                      <Badge
                        key={ub.badge_id}
                        variant="secondary"
                        className="text-xs"
                        style={{ borderColor: ub.badges?.color }}
                      >
                        {ub.badges?.name}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Recent Orders */}
            {orders && orders.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Orders
                  </h3>
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">
                            {order.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${order.total?.toFixed(2)}</p>
                          <Badge
                            variant="outline"
                            className={
                              order.status === 'paid' || order.status === 'completed'
                                ? 'text-emerald-500 border-emerald-500/30'
                                : order.status === 'refunded'
                                ? 'text-red-500 border-red-500/30'
                                : 'text-muted-foreground'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
