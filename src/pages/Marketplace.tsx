import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronRight, ShieldCheck, Award, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { FeaturedProductsCard } from '@/components/home/FeaturedProductsCard';
import { TopSellersCard } from '@/components/marketplace/TopSellersCard';
import { NewArrivalsCard } from '@/components/marketplace/NewArrivalsCard';
import { CategoriesGridCard } from '@/components/marketplace/CategoriesGridCard';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number;
}

function StoreCard({ store }: { store: StoreData }) {
  const accentColor = store.accent_color || '#8B5CF6';
  
  return (
    <Link to={`/store/${store.slug}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full border-border/50 hover:border-primary/30">
        {/* Banner */}
        <div 
          className="h-20 relative overflow-hidden"
          style={{ 
            background: store.banner_url 
              ? `url(${store.banner_url}) center/cover` 
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
        
        <CardContent className="pt-0 -mt-8 relative">
          {/* Logo */}
          <div className="flex items-start gap-3 mb-3">
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name}
                className="h-14 w-14 rounded-lg object-contain bg-background shadow-md flex-shrink-0"
              />
            ) : (
              <div 
                className="h-14 w-14 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Store className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            )}
            
            <div className="flex-1 min-w-0 pt-4">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {store.name}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {store.is_verified && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
                {store.is_trusted && (
                  <Badge 
                    className="text-[10px] px-1.5 py-0 gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0"
                  >
                    <Award className="h-2.5 w-2.5" />
                    Trusted
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Description */}
          {store.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {store.description}
            </p>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {store.follower_count.toLocaleString()} followers
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StoreCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full">
      <Skeleton className="h-20 rounded-none" />
      <CardContent className="pt-0 -mt-8 relative">
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="h-14 w-14 rounded-lg flex-shrink-0" />
          <div className="flex-1 pt-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mb-3" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { hasAccess, loading: accessLoading } = useMarketplaceAccess();
  
  // Fetch all approved stores
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['marketplace-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count')
        .eq('status', 'approved')
        .order('is_trusted', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('follower_count', { ascending: false });
      
      if (error) throw error;
      return data as StoreData[];
    },
    enabled: hasAccess,
  });

  // Redirect if no access (after loading)
  useEffect(() => {
    if (!accessLoading && !hasAccess) {
      navigate('/', { replace: true });
    }
  }, [accessLoading, hasAccess, navigate]);

  // Show nothing while checking access
  if (accessLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render if no access (will redirect)
  if (!hasAccess) {
    return null;
  }

  const isLoading = storesLoading;
  const storesList = stores || [];
  
  // Split stores into rows of varying sizes for responsive grid
  // First 3 rows = 9 stores (on large screens), then featured products, then remaining stores
  const firstBatchStores = storesList.slice(0, 9);
  const remainingStores = storesList.slice(9);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Store className="h-4 w-4" />
            Eclipse Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Discover Amazing Stores
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Browse our curated collection of verified sellers offering premium digital assets, 
            scripts, and resources for your projects.
          </p>
        </div>

        {/* Top Sellers, New Arrivals & Categories Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <TopSellersCard />
          <NewArrivalsCard />
          <CategoriesGridCard />
        </section>

        {/* First batch of stores (3 rows) */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <StoreCardSkeleton key={i} />
              ))
            ) : firstBatchStores.length > 0 ? (
              firstBatchStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No stores available yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Check back soon for amazing sellers!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Featured Products Section */}
        {storesList.length > 0 && (
          <section className="py-4">
            <FeaturedProductsCard />
          </section>
        )}

        {/* Remaining stores */}
        {remainingStores.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">More Stores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {remainingStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          </section>
        )}

        {/* View All Products CTA */}
        <div className="text-center pt-4">
          <Button asChild variant="outline" size="lg">
            <Link to="/products">
              View All Products
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
