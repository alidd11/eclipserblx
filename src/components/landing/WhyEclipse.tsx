import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MessageSquare, ShieldCheck, Sparkles, BarChart3, Zap, BadgeCheck, CreditCard } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: MessageSquare,
    title: 'Discord Ecosystem',
    description: 'Integrated bots & advertising',
  },
  {
    icon: ShieldCheck,
    title: 'AI-Powered Security',
    description: 'Every asset scanned for safety',
  },
  {
    icon: Sparkles,
    title: 'Eclipse+ Savings',
    description: 'Members save up to 30%',
  },
  {
    icon: BarChart3,
    title: 'Seller Tools',
    description: 'Analytics, campaigns & more',
  },
];

const TRUST_SIGNALS = [
  { icon: BadgeCheck, label: 'Verified Sellers' },
  { icon: Zap, label: 'Instant Delivery' },
  { icon: CreditCard, label: 'Secure Payments' },
  { icon: ShieldCheck, label: '3-Day Buyer Protection' },
];

export function WhyEclipse() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <h2 className="text-lg font-bold tracking-tight text-center mb-6">Why Eclipse?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {VALUE_PROPS.map((prop, i) => (
            <div key={prop.title} className="rounded-lg border border-border bg-card p-4 text-center h-full">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary mb-3">
                <prop.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{prop.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{prop.description}</p>
            </div>
          ))}
        </div>

        {/* Trust signals strip */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal.label} className="flex items-center gap-1.5">
              <signal.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-foreground">{signal.label}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
