import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, ShoppingBag, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { HeroProductShowcase } from './HeroProductShowcase';

const POPULAR_SEARCHES = [
  'scripts',
  'maps',
  'ui',
  'weapons',
  'vehicles',
  'admin',
  'tools',
  'free',
];

export function LandingHero() {
  const navigate = useNavigate();

  const handleSearchClick = (term: string) => {
    navigate(`/marketplace?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Simple flat background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />

      <div className="container mx-auto px-4 py-10 sm:py-12 relative z-10">
        <div className="max-w-4xl mx-auto lg:mx-0">
          {/* Text content */}
          <div className="text-center lg:text-left">
            {/* Badge - simpler */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-sm font-medium mb-4">
                <Store className="h-4 w-4" />
                The Roblox Creator Marketplace
              </div>
            </motion.div>

            {/* Main Headline & Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] tracking-tight mb-4">
                Build Your Business.{' '}
                <span className="text-primary">Grow Your Community.</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                The marketplace where Roblox creators sell premium assets, scripts, and resources. 
                Low fees. Instant payouts.
              </p>
            </motion.div>

            {/* CTAs - more compact */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6"
            >
              <Link to="/marketplace">
                <Button size="default" className="h-10 px-5">
                  <Store className="mr-2 h-4 w-4" />
                  Start Selling
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="default" variant="outline" className="h-10 px-5">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/eclipse-plus">
                <Button 
                  size="default" 
                  variant="ghost" 
                  className="h-10 px-5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Eclipse+
                </Button>
              </Link>
            </motion.div>

            {/* Popular Searches - utility content like BuiltByBit */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
            >
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" />
                Popular:
              </span>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handleSearchClick(term)}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {term}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Product showcase below hero text (desktop only) */}
          <div className="hidden lg:block mt-8">
            <HeroProductShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
