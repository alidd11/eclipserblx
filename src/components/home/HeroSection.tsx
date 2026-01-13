import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Shield, Star, Percent, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import { ReviewCard } from './ReviewCard';
import { FeaturedProductsCard } from './FeaturedProductsCard';
import { SectionWrapper } from './SectionWrapper';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-violet-500/5 rounded-full blur-3xl" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      <SectionWrapper as="div" className="pt-8 md:pt-16 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Hero Card Container - matching stats/review card style */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-6 md:p-10 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
            {/* Animated background glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl opacity-50" />
            
            {/* Scanline effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
            
            <div className="relative z-10 text-center space-y-6">
              {/* Enhanced Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/20 to-violet-500/20 border border-primary/30 shadow-lg shadow-primary/10"
              >
                <div className="relative">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div className="absolute inset-0 animate-ping">
                    <Sparkles className="h-4 w-4 text-primary opacity-50" />
                  </div>
                </div>
                <span className="text-sm font-semibold bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">Premium Roblox Assets</span>
              </motion.div>

              {/* Enhanced Heading */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="relative inline-block">
                    Inspiring Your Innovation
                    <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  </span>
                  <br />
                  <span className="relative inline-block mt-2">
                    <span className="bg-gradient-to-r from-primary via-violet-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
                      With Eclipse
                    </span>
                    <Zap className="absolute -right-8 -top-2 h-6 w-6 text-amber-400 animate-pulse" />
                  </span>
                </h1>
              </motion.div>

              {/* Enhanced Description */}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Professional vehicle liveries, powerful scripts, stunning 3D models, and sleek UI kits.{' '}
                <span className="text-foreground font-medium">Everything you need</span> to create an immersive roleplay experience.
              </motion.p>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex items-center justify-center gap-6 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span>5-Star Rated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-violet-400" />
                  <span>Instant Delivery</span>
                </div>
              </motion.div>

              {/* Enhanced CTA */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
              >
                <Link to="/products">
                  <Button size="lg" className="relative group gradient-button border-0 text-lg px-10 py-6 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105">
                    <span className="relative z-10 flex items-center gap-2">
                      Browse Products
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    {/* Button glow */}
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary to-violet-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                  </Button>
                </Link>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/eclipse-plus">
                        <Button size="lg" variant="outline" className="relative group text-lg px-10 py-6 border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 hover:border-amber-500 transition-all duration-300 hover:scale-105 shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/40 overflow-hidden">
                          <span className="relative z-10 flex items-center gap-2 text-amber-400">
                            <Sparkles className="h-5 w-5 animate-pulse" />
                            Eclipse+
                          </span>
                          {/* Animated glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
                          {/* Button glow on hover */}
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="w-64 p-4 bg-card/95 backdrop-blur-sm border-amber-500/30">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Sparkles className="h-4 w-4" />
                          Eclipse+ Benefits
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Percent className="h-4 w-4 text-emerald-400" />
                            <span>30% off all products</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Gift className="h-4 w-4 text-violet-400" />
                            <span>1 free product monthly</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Star className="h-4 w-4 text-amber-400" />
                            <span>Exclusive member badge</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
                          Only £4.99/month
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            </div>
          </div>

          {/* Featured Products Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6"
          >
            <FeaturedProductsCard />
          </motion.div>

          {/* Stats & Reviews Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <StatsCard />
            <ReviewCard />
          </motion.div>
        </motion.div>
      </SectionWrapper>
    </section>
  );
}
