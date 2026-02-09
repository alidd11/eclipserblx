import { Link } from 'react-router-dom';
import { BadgeCheck, Shield, Store, Star, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StoreDetailsCardProps {
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    banner_url?: string | null;
    description?: string | null;
    is_verified?: boolean;
    is_trusted?: boolean;
    product_count?: number;
    average_rating?: number;
    accent_color?: string | null;
  };
  className?: string;
}

export function StoreDetailsCard({ store, className }: StoreDetailsCardProps) {
  return (
    <Link to={`/store/${store.slug}`} className="block group">
      <Card className={cn(
        "bg-card border-border overflow-hidden relative transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 hover:border-primary/30",
        className
      )}>
        {/* Banner background */}
        {store.banner_url && (
          <div className="absolute inset-0 z-0">
            <img 
              src={store.banner_url} 
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-card/70" />
          </div>
        )}
        
        {/* Accent color top border */}
        {store.accent_color && (
          <div 
            className="h-1 w-full relative z-10"
            style={{ backgroundColor: store.accent_color }}
          />
        )}
        
        <CardContent className="p-4 space-y-3 relative z-10">
          {/* Store header */}
          <div className="flex items-start gap-3">
            {/* Store Logo */}
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name}
                className="h-12 w-12 rounded-lg object-contain bg-background/80 backdrop-blur-sm border border-border flex-shrink-0 group-hover:border-primary/30 transition-colors"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-border group-hover:border-primary/30 transition-colors">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display font-semibold text-base truncate group-hover:text-primary transition-colors">
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
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {store.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Store stats - inline */}
          <div className="flex items-center gap-3 text-xs">
            {store.product_count !== undefined && store.product_count > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span>{store.product_count} products</span>
              </div>
            )}
            
            {store.average_rating !== undefined && store.average_rating > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>{store.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
