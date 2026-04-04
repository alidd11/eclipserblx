import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MessageSquare, ShieldCheck, Sparkles, BarChart3, Zap, BadgeCheck, CreditCard } from 'lucide-react';

const BADGES = [
  { icon: MessageSquare, label: 'Discord Ecosystem' },
  { icon: ShieldCheck, label: 'AI-Powered Security' },
  { icon: Sparkles, label: 'Best Prices' },
  { icon: BarChart3, label: 'Seller Tools' },
  { icon: BadgeCheck, label: 'Verified Sellers' },
  { icon: Zap, label: 'Instant Delivery' },
  { icon: CreditCard, label: 'Secure Payments' },
  { icon: ShieldCheck, label: '3-Day Buyer Protection' },
];

export function WhyEclipse() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <h2 className="text-sm font-bold tracking-tight text-center mb-3 uppercase text-muted-foreground">Why Eclipse?</h2>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide justify-start lg:justify-center lg:flex-wrap lg:overflow-visible lg:pb-0">
          {BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5 flex-shrink-0 rounded-full border border-border bg-card px-3 py-1.5 lg:px-4 lg:py-2 hover:border-primary/30 hover:bg-primary/5 transition-all">
              <badge.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{badge.label}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
