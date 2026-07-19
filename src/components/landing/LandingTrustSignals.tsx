import { Percent, Zap, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function LandingTrustSignals() {
  const { t } = useTranslation();

  const stats = [
    { icon: Percent, value: '15%', titleKey: 'landing.industryLowFees', descKey: 'landing.industryLowFeesDesc' },
    { icon: Zap, value: 'Instant', titleKey: 'landing.instantPayouts', descKey: 'landing.instantPayoutsDesc' },
    { icon: BadgeCheck, value: '100%', titleKey: 'landing.verifiedSellers', descKey: 'landing.verifiedSellersDesc' },
  ];

  return (
    <section className="py-8 sm:py-10 border-y border-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.titleKey}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="flex items-start gap-4 py-6 sm:py-0 sm:px-8 first:pt-0 sm:first:pl-0 last:pb-0 sm:last:pr-0"
            >
              <stat.icon className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span className="font-display text-2xl font-bold text-foreground tracking-tight">
                    {stat.value}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(stat.titleKey)}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[34ch]">
                  {t(stat.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
