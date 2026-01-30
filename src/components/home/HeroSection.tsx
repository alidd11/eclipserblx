import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import { ReviewCard } from './ReviewCard';
import { FeaturedProductsCard } from './FeaturedProductsCard';
import { DiscordWidget } from './DiscordWidget';
import { SectionWrapper } from './SectionWrapper';
import { motion } from 'framer-motion';
import { MarketplaceHeroButton } from '@/components/marketplace/MarketplaceHeroButton';
import { ActiveOffersCard } from './ActiveOffersCard';

export function HeroSection() {
  return (
    <section className="relative">
      <SectionWrapper as="div" className="pt-6 md:pt-10 relative">
        {/* Hero Content - Editorial asymmetric layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left column - Main content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Hero Card */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
              <div className="space-y-4">
                {/* Subtle category label */}
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Roblox Creator Marketplace
                </span>

                {/* Main heading - tighter, more editorial */}
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.1] tracking-tight">
                  Inspiring Your
                  <br />
                  <span className="text-primary">Innovation</span>
                </h1>

                {/* Description - left aligned, editorial */}
                <p className="text-base text-muted-foreground max-w-md leading-relaxed">
                  Premium liveries, UI kits, and Discord bots from verified creators. 
                  Instant download, lifetime updates.
                </p>

                {/* CTAs - stacked on desktop for editorial feel */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link to="/products">
                    <Button size="lg" className="text-base px-6">
                      Browse Products
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/eclipse-plus">
                    <Button size="lg" variant="outline" className="text-base px-6 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Eclipse+
                    </Button>
                  </Link>
                  <MarketplaceHeroButton />
                </div>
              </div>
            </div>

            {/* Active Offers */}
            <ActiveOffersCard />
          </motion.div>

          {/* Right column - Stats & Discord stacked */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-5 space-y-4"
          >
            <StatsCard />
            <ReviewCard />
            <div className="hidden lg:block">
              <DiscordWidget />
            </div>
          </motion.div>
        </div>

        {/* Featured Products - Full width below */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-6"
        >
          <FeaturedProductsCard />
        </motion.div>

        {/* Discord Widget - Mobile only (shown in right column on desktop) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 lg:hidden"
        >
          <DiscordWidget />
        </motion.div>
      </SectionWrapper>
    </section>
  );
}
