import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FollowButton } from '@/components/store/FollowButton';
import { 
  Store as StoreIcon, 
  CheckCircle, 
  Package, 
  Users,
  Bell,
  BellOff,
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
    description: string | null;
    is_verified: boolean;
    product_count: number | null;
    follower_count: number | null;
    accent_color: string | null;
  };
}

export function FollowingPage() {
  const { user } = useAuth();

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto py-8 px-4 space-y-4">
          <h1 className="text-2xl font-bold mb-6">Following</h1>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
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
            <Card key={follow.id} className="overflow-hidden border-border bg-card hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 p-3 sm:p-4">
                {/* Store Logo */}
                <Link to={`/store/${store.slug}`} className="flex-shrink-0">
                  <div className="h-11 w-11 rounded-lg flex items-center justify-center overflow-hidden border border-border bg-muted/50">
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

                {/* Store Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
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
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                      {store.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {store.product_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {store.follower_count || 0}
                    </span>
                    {follow.notify_new_products ? (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Bell className="h-3 w-3" />
                        Notifs on
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <BellOff className="h-3 w-3" />
                        Notifs off
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                  <FollowButton 
                    storeId={store.id} 
                    accentColor={accentColor}
                    size="sm"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/store/${store.slug}`}>
                      View Store
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
}
