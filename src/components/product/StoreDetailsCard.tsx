import { Link } from 'react-router-dom';
import { BadgeCheck, Shield, Store, Users, Star, Package, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StoreDetailsCardProps {
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    description?: string | null;
    is_verified?: boolean;
    is_trusted?: boolean;
    follower_count?: number;
    product_count?: number;
    average_rating?: number;
    accent_color?: string | null;
  };
  className?: string;
}

export function StoreDetailsCard({ store, className }: StoreDetailsCardProps) {
  return (
    <Card className={cn("bg-card border-border overflow-hidden", className)}>
      {/* Accent color banner */}
      {store.accent_color && (
        <div 
          className="h-2 w-full"
          style={{ backgroundColor: store.accent_color }}
        />
      )}
      
      <CardContent className="p-4 space-y-4">
        {/* Store header */}
        <div className="flex items-start gap-3">
          {/* Store Logo */}
          {store.logo_url ? (
            <img 
              src={store.logo_url} 
              alt={store.name}
              className="h-14 w-14 rounded-lg object-contain bg-background border border-border flex-shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-semibold text-lg truncate">
                {store.name}
              </h3>
              {store.is_verified && (
                <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )}
              {store.is_trusted && (
                <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            
            {store.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {store.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Store stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {store.product_count !== undefined && store.product_count > 0 && (
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Package className="h-3.5 w-3.5" />
                <span className="font-semibold text-sm">{store.product_count}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Products</p>
            </div>
          )}
          
          {store.follower_count !== undefined && store.follower_count > 0 && (
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-primary">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-sm">{store.follower_count}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Followers</p>
            </div>
          )}
          
          {store.average_rating !== undefined && store.average_rating > 0 && (
            <div className="p-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-semibold text-sm">{store.average_rating.toFixed(1)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Rating</p>
            </div>
          )}
        </div>
        
        {/* Visit store button */}
        <Button asChild variant="outline" className="w-full group">
          <Link to={`/store/${store.slug}`}>
            <Store className="h-4 w-4 mr-2" />
            Visit Store
            <ChevronRight className="h-4 w-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
