import { Link } from 'react-router-dom';
import { BadgeCheck, Shield, Store, Star, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
  const accentColor = store.accent_color || 'hsl(var(--primary))';
  
  return (
    <Link to={`/store/${store.slug}`} className="block group">
      <Card className={cn(
        "overflow-hidden transition-all duration-300 border-border",
        "hover:shadow-xl hover:shadow-primary/15 hover:-translate-y-1 hover:border-primary/40",
        className
      )}>
        {/* Full card with banner background */}
        <div className="relative">
          {/* Banner as background */}
          {store.banner_url && (
            <div className="absolute inset-0 z-0">
              <img 
                src={store.banner_url} 
                alt=""
                className="w-full h-full object-cover object-center"
              />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
            </div>
          )}
          
          {/* Fallback gradient background when no banner */}
          {!store.banner_url && (
            <div 
              className="absolute inset-0 z-0"
              style={{ 
                background: `linear-gradient(135deg, ${accentColor}20 0%, hsl(var(--card)) 50%, ${accentColor}10 100%)`
              }}
            />
          )}
          
          {/* Content */}
          <div className={cn(
            "relative z-10 p-4 space-y-3",
            store.banner_url ? "text-white" : ""
          )}>
            {/* Store header */}
            <div className="flex items-center gap-3">
              {/* Store Logo */}
              {store.logo_url ? (
                <img 
                  src={store.logo_url} 
                  alt={store.name}
                  className="h-14 w-14 rounded-xl object-contain bg-white/90 backdrop-blur-sm border-2 border-white/20 flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border-2 border-white/20 shadow-lg">
                  <Store className="h-6 w-6 text-white/80" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={cn(
                    "font-display font-bold text-lg truncate transition-colors",
                    store.banner_url 
                      ? "text-white group-hover:text-white/90" 
                      : "text-foreground group-hover:text-primary"
                  )}>
                    {store.name}
                  </h3>
                  {store.is_verified && (
                    <BadgeCheck className="h-5 w-5 text-blue-400 flex-shrink-0 drop-shadow-sm" />
                  )}
                  {store.is_trusted && (
                    <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 drop-shadow-sm" />
                  )}
                </div>
                
                {store.description && (
                  <p className={cn(
                    "text-sm line-clamp-1 mt-0.5",
                    store.banner_url ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {store.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Store stats */}
            <div className={cn(
              "flex items-center gap-4 text-sm pt-1",
              store.banner_url ? "text-white/90" : "text-muted-foreground"
            )}>
              {store.product_count !== undefined && store.product_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Package className={cn(
                    "h-4 w-4",
                    store.banner_url ? "text-white/70" : "text-primary"
                  )} />
                  <span className="font-medium">{store.product_count}</span>
                  <span className="opacity-70">products</span>
                </div>
              )}
              
              {store.average_rating !== undefined && store.average_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{store.average_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Accent color bottom border */}
          <div 
            className="h-1 w-full relative z-10"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </Card>
    </Link>
  );
}
