import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { FollowButton } from '@/components/store/FollowButton';
import { toast } from 'sonner';
import { 
  Store as StoreIcon, 
  CheckCircle, 
  Package, 
  Users,
  Bell,
  ArrowRight
} from 'lucide-react';

interface FollowedStore {
  id: string;
  store_id: string;
  notify_new_products: boolean;
  created_at: string;
  stores: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    banner_url: string | null;
    description: string | null;
    is_verified: boolean;
    product_count: number | null;
    follower_count: number | null;
    accent_color: string | null;
  };
}

export function FollowingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followedStores, isLoading } = useQuery({
    queryKey: ['followed-stores', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('store_follows')
        .select(`
          id,
          store_id,
          notify_new_products,
          created_at,
          stores (
            id,
            name,
            slug,
            logo_url,
            banner_url,
            description,
            is_verified,
            product_count,
            follower_count,
            accent_color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FollowedStore[];
    },
    enabled: !!user?.id,
  });

  const toggleNotifyMutation = useMutation({
    mutationFn: async ({ followId, currentValue }: { followId: string; currentValue: boolean }) => {
      const { error } = await supabase
        .from('store_follows')
        .update({ notify_new_products: !currentValue })
        .eq('id', followId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-stores'] });
    },
    onError: () => {
      toast.error('Failed to update notification preference');
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8 px-4 space-y-4">
          <h1 className="text-2xl font-bold mb-6">Following</h1>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </MainLayout>
    );
  }

  if (!followedStores || followedStores.length === 0) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <h1 className="text-2xl font-bold mb-6">Following</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Not Following Anyone Yet</h3>
              <p className="text-muted-foreground mb-4">
                Follow your favorite creators to get notified when they release new products.
              </p>
              <Button asChild>
                <Link to="/products">
                  Discover Creators
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-4">
        <h1 className="text-2xl font-bold mb-6">Following</h1>
        {followedStores.map((follow) => {
          const store = follow.stores;
          const accentColor = store.accent_color || 'hsl(var(--primary))';
          
          return (
            <Card key={follow.id} className="overflow-hidden border-border bg-card hover:border-primary/30 transition-colors group">
              {/* Banner */}
              {store.banner_url ? (
                <Link to={`/store/${store.slug}`} className="block relative h-24 overflow-hidden">
                  <img 
                    src={store.banner_url} 
                    alt=""
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
                </Link>
              ) : (
                <div 
                  className="h-16"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}08 100%)`
                  }}
                />
              )}

              {/* Content */}
              <div className="px-4 pb-4 space-y-3">
                {/* Store identity row */}
                <div className="flex items-start gap-3">
                  <Link to={`/store/${store.slug}`} className="flex-shrink-0 -mt-6 relative z-10">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden border border-border bg-card">
                      {store.logo_url ? (
                        <img 
                          src={store.logo_url} 
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <StoreIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Link 
                        to={`/store/${store.slug}`}
                        className="font-semibold text-sm hover:text-primary transition-colors truncate"
                      >
                        {store.name}
                      </Link>
                      {store.is_verified && (
                        <CheckCircle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    {store.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {store.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {store.product_count || 0} Products
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {store.follower_count || 0} Followers
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/store/${store.slug}`}>
                        View Store
                      </Link>
                    </Button>
                    <FollowButton 
                      storeId={store.id} 
                      accentColor={accentColor}
                      size="sm"
                    />
                  </div>

                  {/* Notification toggle */}
                  <button
                    className="flex items-center gap-2 text-xs cursor-pointer group/notif"
                    onClick={() => toggleNotifyMutation.mutate({ 
                      followId: follow.id, 
                      currentValue: follow.notify_new_products 
                    })}
                    disabled={toggleNotifyMutation.isPending}
                  >
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground group-hover/notif:text-foreground transition-colors">
                      Notifications
                    </span>
                    <Switch
                      checked={follow.notify_new_products}
                      className="pointer-events-none scale-90"
                    />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
}