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

export function HeroSection() {
  return (
    <section className="relative">
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      
      <SectionWrapper as="div" className="pt-8 md:pt-16 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Hero Content - Clean, minimal card */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-10">
            <div className="text-center space-y-5 max-w-3xl mx-auto">
              {/* Simple badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Roblox Creator Marketplace
              </div>

              {/* Main heading - specific, not generic */}
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                Scripts, Liveries & Assets for Roblox Developers
              </h1>

              {/* Concise description */}
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                147+ premium assets ready for instant download. Vehicle liveries, UI kits, Discord bots, and more.
              </p>

              {/* Clean CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link to="/products">
                  <Button size="lg" className="text-base px-8 py-6">
                    Browse Products
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/eclipse-plus">
                  <Button size="lg" variant="outline" className="text-base px-8 py-6 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Eclipse+ — 30% Off Everything
                  </Button>
                </Link>
                <MarketplaceHeroButton />
              </div>
            </div>
          </div>

          {/* Featured Products Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-6"
          >
            <FeaturedProductsCard />
          </motion.div>

          {/* Stats, Reviews & Discord Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <StatsCard />
            <ReviewCard />
            <div className="sm:col-span-2 lg:col-span-1">
              <DiscordWidget />
            </div>
          </motion.div>
        </motion.div>
      </SectionWrapper>
    </section>
  );
}
