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
    <section className="py-6 sm:py-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {t('landing.whyChoose')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('landing.whyChooseDesc')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {trustSignals.map((signal, index) => (
            <motion.div
              key={signal.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group"
            >
              <div className="h-full rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <signal.icon className="h-4 w-4 text-primary" />
                  </div>
                  {signal.highlight && (
                    <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-semibold">
                      {signal.highlight}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {t(signal.titleKey)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
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
