import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import { ReviewCard } from './ReviewCard';
import { FeaturedProductsCard } from './FeaturedProductsCard';
import { DiscordWidget } from './DiscordWidget';
import { SectionWrapper } from './SectionWrapper';
import { motion } from 'framer-motion';
import { MarketplaceHeroButton } from '@/components/marketplace/MarketplaceHeroButton';
import { ActiveOffersCard } from './ActiveOffersCard';
import { PromotionCarousel } from './PromotionCarousel';
import { TopSellersCard } from '@/components/marketplace/TopSellersCard';
import { NewArrivalsCard } from '@/components/marketplace/NewArrivalsCard';
import { CategoriesGridCard } from '@/components/marketplace/CategoriesGridCard';

export function HeroSection() {
  return (
    <section className="relative">
      {/* Flat background */}
      <div className="absolute inset-0 bg-background" />
      
      <SectionWrapper as="div" className="pt-6 md:pt-10 relative">
        {/* ========== MOBILE/TABLET LAYOUT (< lg) ========== */}
        <div className="lg:hidden">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Content - Clean, centered card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-center space-y-5 max-w-3xl mx-auto">
                {/* Simple badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Rocket className="h-4 w-4" />
                  Roblox Creator Marketplace
                </div>

                {/* Main heading */}
                <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
                  Inspiring Your Innovation
                </h1>

                {/* Concise description */}
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Premium liveries, UI kits, and Discord bots. Instant download, lifetime updates.
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
                      Eclipse+
                    </Button>
                  </Link>
                  <MarketplaceHeroButton />
                </div>
              </div>
            </div>

            {/* Active Offers Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mt-6"
            >
              <ActiveOffersCard />
            </motion.div>

            {/* Promotion Carousel */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-4"
            >
              <PromotionCarousel />
            </motion.div>

            {/* Featured Products Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-4"
            >
              <FeaturedProductsCard />
            </motion.div>

            {/* Stats, Reviews & Discord Cards - Stacked */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-4 flex flex-col gap-3"
            >
              <StatsCard />
              <ReviewCard />
              <DiscordWidget />
            </motion.div>
          </motion.div>
        </div>

        {/* ========== DESKTOP LAYOUT (lg+) - Editorial Asymmetric ========== */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left column - Main content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="col-span-7 space-y-6"
            >
              {/* Hero Card */}
              <div className="rounded-2xl border border-border bg-card p-8">
                <div className="space-y-4">
                  {/* Subtle category label */}
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Roblox Creator Marketplace
                  </span>

                  {/* Main heading - editorial style */}
                  <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
                    Inspiring Your
                    <br />
                    <span className="text-primary">Innovation</span>
                  </h1>

                  {/* Description - left aligned */}
                  <p className="text-base text-muted-foreground max-w-md leading-relaxed">
                    Premium liveries, UI kits, and Discord bots from verified creators. 
                    Instant download, lifetime updates.
                  </p>

                  {/* CTAs */}
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
              className="col-span-5 space-y-4"
            >
              <StatsCard />
              <ReviewCard />
              <DiscordWidget />
            </motion.div>
          </div>

          {/* Promotion Carousel - Full width */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-6"
          >
            <PromotionCarousel />
          </motion.div>

          {/* Marketplace Widgets Row - 3 columns */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="mt-4 grid grid-cols-3 gap-4"
          >
            <TopSellersCard />
            <NewArrivalsCard />
            <CategoriesGridCard />
          </motion.div>

          {/* Featured Products - Full width below */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-4"
          >
            <FeaturedProductsCard />
          </motion.div>
        </div>
      </SectionWrapper>
    </section>
  );
}
