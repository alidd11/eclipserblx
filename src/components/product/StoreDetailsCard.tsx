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
        "overflow-hidden transition-all duration-300 border-border bg-card",
        "hover:shadow-xl hover:shadow-primary/15 hover:-translate-y-1 hover:border-primary/40",
        className
      )}>
        {/* Banner section */}
        {store.banner_url ? (
          <div className="relative h-20 overflow-hidden">
            <img 
              src={store.banner_url} 
              alt=""
              className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            />
            {/* Gradient blend into black area */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95" />
          </div>
        ) : (
          /* Accent gradient when no banner */
          <div 
            className="h-16"
            style={{ 
              background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)`
            }}
          />
        )}
        
        {/* Content area - dark background */}
        <div className="bg-black/95 px-3 py-2.5 space-y-2">
          {/* Store header */}
          <div className="flex items-center gap-3">
            {/* Store Logo - positioned to overlap banner slightly */}
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name}
                className="h-12 w-12 rounded-lg object-contain bg-white/10 backdrop-blur-sm border border-white/10 flex-shrink-0 group-hover:border-primary/50 transition-colors"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/10">
                <Store className="h-5 w-5 text-white/60" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display font-bold text-base text-white truncate group-hover:text-primary transition-colors">
                  {store.name}
                </h3>
                {store.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
                )}
                {store.is_trusted && (
                  <Shield className="h-4 w-4 text-amber-400 flex-shrink-0" />
                )}
              </div>
              
              {store.description && (
                <p className="text-xs text-white/60 line-clamp-1 mt-0.5">
                  {store.description}
                </p>
              )}
            </div>
          </div>
          
          {/* Store stats */}
          <div className="flex items-center gap-4 text-xs text-white/70">
            {store.product_count !== undefined && store.product_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span>{store.product_count} products</span>
              </div>
            )}
            
            {store.average_rating !== undefined && store.average_rating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{store.average_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* Accent line */}
          <div 
            className="h-0.5 w-full rounded-full opacity-60"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      </Card>
    </Link>
  );
}
