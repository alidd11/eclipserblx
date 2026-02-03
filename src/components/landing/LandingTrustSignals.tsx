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

const trustSignals = [
  {
    icon: Percent,
    title: 'Industry-Low Fees',
    description: 'Just 10% commission. Keep more of what you earn compared to competitors.',
    highlight: '10%',
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    description: 'Get paid immediately via Stripe. No waiting periods, no hassle.',
    highlight: null,
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Protected by Stripe with full PCI compliance and buyer protection.',
    highlight: null,
  },
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    description: 'All sellers are manually reviewed to ensure quality and trust.',
    highlight: null,
  },
  {
    icon: CreditCard,
    title: 'Multiple Payment Methods',
    description: 'Accept cards, Apple Pay, Google Pay, and more. GBP focus.',
    highlight: null,
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Real humans ready to help Mon-Sat, 9AM-7PM via chat & tickets.',
    highlight: null,
  },
  {
    icon: RefreshCw,
    title: 'Free Updates',
    description: 'Buyers get lifetime updates on all purchased products.',
    highlight: null,
  },
  {
    icon: Users,
    title: 'Growing Community',
    description: 'Join thousands of creators in our Discord community.',
    highlight: null,
  },
];

export function LandingTrustSignals() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            Why Choose Eclipse?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built by creators, for creators. We've designed every feature to help you succeed.
          </p>
        </motion.div>

        {/* Trust Signals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustSignals.map((signal, index) => (
            <motion.div
              key={signal.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group"
            >
              <div className="h-full rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                {/* Icon with highlight badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <signal.icon className="h-6 w-6 text-primary" />
                  </div>
                  {signal.highlight && (
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                      {signal.highlight}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground mb-2">
                  {signal.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {signal.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
