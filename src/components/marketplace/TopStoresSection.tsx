import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Award, Users, ChevronRight, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface TopStore {
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

export function TopStoresSection() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['top-stores-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count')
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('is_testing', false)
        .order('is_trusted', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('follower_count', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as TopStore[];
    },
  });

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Top Stores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-24 rounded-none" />
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
          ))}
        </div>
      </section>
    );
  }

  if (!stores || stores.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        Top Stores
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store, index) => {
          const accentColor = store.accent_color || '#8B5CF6';
          return (
            <Link key={store.id} to={`/store/${store.slug}`}>
              <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full border-border/50 hover:border-primary/30 relative">
                {/* Rank Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge 
                    className={`text-white border-0 gap-1 ${
                      index === 0 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      'bg-gradient-to-r from-amber-700 to-amber-800'
                    }`}
                  >
                    <Crown className="h-3 w-3" />
                    #{index + 1}
                  </Badge>
                </div>

                {/* Banner */}
                <div 
                  className="h-24 relative overflow-hidden"
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
        })}
      </div>
    </section>
  );
}
