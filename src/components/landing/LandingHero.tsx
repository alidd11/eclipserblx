import { Link } from 'react-router-dom';
import { ArrowRight, Store, Sparkles, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function LandingHero() {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2 }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
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
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight mb-6"
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
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            Eclipse is the marketplace where Roblox creators sell premium assets, 
            scripts, and resources. Low fees. Instant payouts. Trusted by thousands.
          </motion.p>

          {/* CTAs - Seller-first */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/become-seller">
              <Button size="lg" className="text-lg px-8 py-6 h-auto">
                <Store className="mr-2 h-5 w-5" />
                Start Selling Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Browse Marketplace
              </Button>
            </Link>
            <Link to="/eclipse-plus">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 h-auto border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Eclipse+
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
