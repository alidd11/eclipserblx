import { Link } from 'react-router-dom';
import { ArrowRight, Store, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function LandingCTA() {
  const { t } = useTranslation();

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden">

      <div className="px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t('landing.readyToStart')}
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            {t('landing.ctaDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/marketplace">
              <Button size="lg" className="text-lg px-8 py-6 h-auto w-full sm:w-auto">
                <Store className="mr-2 h-5 w-5" />
                {t('landing.openYourStore')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto w-full sm:w-auto">
                <ShoppingBag className="mr-2 h-5 w-5" />
                {t('landing.exploreProducts')}
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            {t('landing.joinCreators')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
