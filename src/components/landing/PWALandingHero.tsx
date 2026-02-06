import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { PWAFeaturedStores } from '@/components/landing/PWAFeaturedStores';
import { PWAFeaturedProducts } from '@/components/landing/PWAFeaturedProducts';
import { HeroBanner } from './HeroBanner';

export function PWALandingHero() {
  return (
    <div 
      className="flex flex-col"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Hero Section with Banner */}
      <div className="relative overflow-hidden">
        <HeroBanner />
        
        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-8">
          {/* Headline */}
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-center leading-tight tracking-tight mb-3">
            The All-In-One Platform for{' '}
            <span className="text-primary">Roblox Creators</span>
          </h1>

          {/* Tagline */}
          <p className="text-muted-foreground text-center text-base max-w-md mb-6 leading-relaxed">
            Find premium scripts, models, and game assets from verified creators. Instant delivery. Secure checkout.
          </p>

          {/* CTA Buttons */}
          <div className="w-full max-w-sm space-y-3 mb-8">
            <Link to="/marketplace" className="block">
              <Button 
                size="lg" 
                className="w-full h-14 text-lg font-semibold rounded-full"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shop
              </Button>
            </Link>
            
            <Link to="/seller" className="block">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-14 text-lg font-semibold rounded-full"
              >
                <Store className="mr-2 h-5 w-5" />
                Open a Store
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-4 space-y-6 pb-6">
        {/* Featured Stores */}
        <PWAFeaturedStores />
        
        {/* Active Offers */}
        <ActiveOffersCard />
        
        {/* Featured Products */}
        <PWAFeaturedProducts />
      </div>
    </div>
  );
}
