import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MessageSquare, ShieldCheck, Sparkles, BarChart3 } from 'lucide-react';

const VALUE_PROPS = [
  {
    icon: MessageSquare,
    title: 'Discord Ecosystem',
    description: 'Grow your community with integrated Discord bots and advertising.',
  },
  {
    icon: ShieldCheck,
    title: 'AI-Powered Security',
    description: 'Every asset is scanned for safety. Buy and sell with confidence.',
  },
  {
    icon: Sparkles,
    title: 'Eclipse+ Savings',
    description: 'Members save up to 30% on products with exclusive discounts.',
  },
  {
    icon: BarChart3,
    title: 'Seller Tools',
    description: 'Analytics, campaigns, bundles, and everything to scale your business.',
  },
];

export function WhyEclipse() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <h2 className="text-lg font-bold tracking-tight text-center mb-6">Why Eclipse?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {VALUE_PROPS.map((prop, i) => (
            <ScrollReveal key={prop.title} delay={i * 0.06} direction="up" distance={12} duration={0.3}>
              <div className="rounded-lg border border-border bg-card p-4 text-center h-full">
                <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary mb-3">
                  <prop.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{prop.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{prop.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
