import { Link } from 'react-router-dom';
import { Store, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { motion } from 'framer-motion';

export function MarketplaceHeroButton() {
  const { hasAccess, loading } = useMarketplaceAccess();

  // Don't render if loading or no access
  if (loading || !hasAccess) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
    >
      <Link to="/marketplace">
        <Button 
          size="lg" 
          variant="outline" 
          className="relative group text-lg px-10 py-6 border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 hover:border-violet-500 transition-all duration-300 hover:scale-105 shadow-xl shadow-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/40 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2 text-violet-400">
            <Store className="h-5 w-5" />
            Eclipse Marketplace
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/20 to-violet-500/0 animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
          {/* Button glow on hover */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
        </Button>
      </Link>
    </motion.div>
  );
}
