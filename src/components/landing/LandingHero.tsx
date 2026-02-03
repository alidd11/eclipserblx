import { Link } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { HeroProductShowcase } from './HeroProductShowcase';

export function LandingHero() {
  return (
    <section className="relative min-h-[55vh] flex items-center overflow-hidden">
      {/* Simplified background - cleaner look */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        {/* Two-column grid for desktop */}
        <div className="grid lg:grid-cols-[55%_45%] gap-8 lg:gap-12 items-center">
          {/* Left column - Text content */}
          <div className="max-w-2xl lg:max-w-none text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Store className="h-4 w-4" />
                The Roblox Creator Marketplace
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            >
              Build Your Business.
              <br />
              <span className="text-primary">Grow Your Community.</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Eclipse is the marketplace where Roblox creators sell premium assets, 
              scripts, and resources. Low fees. Instant payouts. Trusted by thousands.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link to="/marketplace">
                <Button size="lg" className="h-12 px-6 text-base">
                  <Store className="mr-2 h-5 w-5" />
                  Start Selling Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="outline" className="h-12 px-6 text-base">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Browse Marketplace
                </Button>
              </Link>
              <Link to="/eclipse-plus">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 px-6 text-base border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Eclipse+
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right column - Product showcase (desktop only) */}
          <div className="hidden lg:block">
            <HeroProductShowcase />
          </div>
        </div>
      </div>
    </section>
  );
}
