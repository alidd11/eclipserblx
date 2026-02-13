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
  Star,
  MessageSquare,
  Heart,
  Crown,
  Clock,
  AtSign,
  Globe,
  Store,
  Users,
  Gamepad2,
  Link2,
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
    roblox_user_id?: string | null;
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

  // Fetch affiliate status
  const { data: affiliateStatus } = useQuery({
    queryKey: ['customer-affiliate', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from('affiliate_applications')
        .select('affiliate_id, status, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch seller/store status
  const { data: sellerStore } = useQuery({
    queryKey: ['customer-store', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      const { data, error } = await supabase
        .from('stores')
        .select('store_id, name, slug, status, is_active, is_verified, is_trusted, created_at')
        .eq('owner_id', profile.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && open,
  });

  // Fetch last known IP from user_ip_logs (primary) or audit_logs (fallback)
  const { data: lastIp } = useQuery({
    queryKey: ['customer-last-ip', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return null;
      
      // First try user_ip_logs table (more reliable IP tracking)
      const { data: ipLog, error: ipError } = await supabase
        .from('user_ip_logs')
        .select('ip_address, created_at')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!ipError && ipLog?.ip_address) {
        return ipLog;
      }
      
      // Fallback to audit_logs
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
        <DialogHeader className="p-6 pb-4 bg-muted/30">
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
                    <User className="h-4 w-4" />
                    Customer ID
                  </span>
                  <span className="font-mono text-sm text-primary">{profile.customer_id || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Joined
                  </span>
                  <span className="font-medium">{format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
                </div>
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

            {/* Linked Accounts */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Linked Accounts
              </h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Discord
                  </span>
                  {profile.discord_username ? (
                    <div className="text-right">
                      <span className="font-medium">{profile.discord_username}</span>
                      {profile.discord_id && (
                        <p className="text-xs text-muted-foreground font-mono">{profile.discord_id}</p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Not linked</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    Roblox
                  </span>
                  {profile.roblox_username ? (
                    <div className="text-right">
                      <span className="font-medium">{profile.roblox_username}</span>
                      {profile.roblox_user_id && (
                        <p className="text-xs text-muted-foreground font-mono">{profile.roblox_user_id}</p>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Not linked</Badge>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            {/* Affiliate Status */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Affiliate Status
              </h3>
              {affiliateStatus ? (
                <div className={`p-4 rounded-lg border ${
                  affiliateStatus.status === 'approved' 
                    ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20'
                    : affiliateStatus.status === 'pending'
                    ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20'
                    : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          affiliateStatus.status === 'approved' ? 'default' :
                          affiliateStatus.status === 'pending' ? 'secondary' : 'outline'
                        } className={
                          affiliateStatus.status === 'approved' ? 'bg-emerald-500' :
                          affiliateStatus.status === 'pending' ? 'bg-yellow-500' : ''
                        }>
                          {affiliateStatus.status.charAt(0).toUpperCase() + affiliateStatus.status.slice(1)}
                        </Badge>
                        {affiliateStatus.affiliate_id && (
                          <span className="text-xs font-mono text-muted-foreground">{affiliateStatus.affiliate_id}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied {format(new Date(affiliateStatus.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Users className={`h-6 w-6 ${
                      affiliateStatus.status === 'approved' ? 'text-emerald-500' :
                      affiliateStatus.status === 'pending' ? 'text-yellow-500' : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  Not an affiliate
                </p>
              )}
            </section>

            <Separator />

            {/* Seller Status */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Seller Status
              </h3>
              {sellerStore ? (
                <div className={`p-4 rounded-lg border ${
                  sellerStore.is_active 
                    ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20'
                    : 'bg-muted/50 border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{sellerStore.name}</span>
                        {sellerStore.is_trusted && (
                          <Badge className="bg-purple-500 text-xs">Trusted</Badge>
                        )}
                        {sellerStore.is_verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        {!sellerStore.is_active && (
                          <Badge variant="outline" className="text-red-500 border-red-500/30 text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-1">{sellerStore.store_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Since {format(new Date(sellerStore.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Store className={`h-6 w-6 ${sellerStore.is_active ? 'text-purple-500' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  Not a seller
                </p>
              )}
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
