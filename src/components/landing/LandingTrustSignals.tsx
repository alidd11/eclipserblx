import { 
  Shield, 
  Zap, 
  Percent, 
  CreditCard, 
  HeadphonesIcon, 
  RefreshCw,
  Users,
  BadgeCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function LandingTrustSignals() {
  const { t } = useTranslation();

  const trustSignals = [
    {
      icon: Percent,
      titleKey: 'landing.industryLowFees',
      descKey: 'landing.industryLowFeesDesc',
      highlight: '10%',
    },
    {
      icon: Zap,
      titleKey: 'landing.instantPayouts',
      descKey: 'landing.instantPayoutsDesc',
      highlight: null,
    },
    {
      icon: Shield,
      titleKey: 'landing.securePayments',
      descKey: 'landing.securePaymentsDesc',
      highlight: null,
    },
    {
      icon: BadgeCheck,
      titleKey: 'landing.verifiedSellers',
      descKey: 'landing.verifiedSellersDesc',
      highlight: null,
    },
    {
      icon: CreditCard,
      titleKey: 'landing.multiplePayments',
      descKey: 'landing.multiplePaymentsDesc',
      highlight: null,
    },
    {
      icon: HeadphonesIcon,
      titleKey: 'landing.dedicatedSupport',
      descKey: 'landing.dedicatedSupportDesc',
      highlight: null,
    },
    {
      icon: RefreshCw,
      titleKey: 'landing.freeUpdates',
      descKey: 'landing.freeUpdatesDesc',
      highlight: null,
    },
    {
      icon: Users,
      titleKey: 'landing.growingCommunity',
      descKey: 'landing.growingCommunityDesc',
      highlight: null,
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            {t('landing.whyChoose')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.whyChooseDesc')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustSignals.map((signal, index) => (
            <motion.div
              key={signal.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group"
            >
              <div className="h-full rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <signal.icon className="h-6 w-6 text-primary" />
                  </div>
                  {signal.highlight && (
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                      {signal.highlight}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground mb-2">
                  {t(signal.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(signal.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
