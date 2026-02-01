import { Link } from 'react-router-dom';
import { ArrowRight, Store, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function LandingCTA() {
  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Whether you're looking to sell your creations or find the perfect assets for your project, 
            Eclipse has you covered.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/marketplace">
              <Button size="lg" className="text-lg px-8 py-6 h-auto w-full sm:w-auto">
                <Store className="mr-2 h-5 w-5" />
                Open Your Store
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto w-full sm:w-auto">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Explore Products
              </Button>
            </Link>
          </div>

          {/* Trust note */}
          <p className="text-sm text-muted-foreground mt-8">
            Join thousands of creators already growing with Eclipse
          </p>
        </motion.div>
      </div>
    </section>
  );
}
