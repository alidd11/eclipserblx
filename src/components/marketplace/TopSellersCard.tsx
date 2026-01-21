import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Store, ChevronRight, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface TopSeller {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  total_sales: number;
}

export function TopSellersCard() {
  const { data: sellers, isLoading } = useQuery({
    queryKey: ['top-sellers'],
    queryFn: async () => {
      // Get stores with most completed orders
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, accent_color, is_verified')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('follower_count', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as TopSeller[];
    },
  });

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          Top Sellers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : sellers && sellers.length > 0 ? (
          sellers.map((seller, index) => {
            const accentColor = seller.accent_color || '#8B5CF6';
            return (
              <Link
                key={seller.id}
                to={`/store/${seller.slug}`}
                className="group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  {index < 3 && (
                    <div className="absolute -top-1 -left-1 z-10">
                      <Crown 
                        className={`h-3.5 w-3.5 ${
                          index === 0 ? 'text-amber-400' : 
                          index === 1 ? 'text-gray-400' : 
                          'text-amber-600'
                        }`} 
                      />
                    </div>
                  )}
                  {seller.logo_url ? (
                    <img 
                      src={seller.logo_url} 
                      alt={seller.name}
                      className="h-10 w-10 rounded-lg object-contain bg-background"
                    />
                  ) : (
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <Store className="h-4 w-4" style={{ color: accentColor }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {seller.name}
                    </span>
                    {seller.is_verified && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    #{index + 1} Top Seller
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sellers available yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
