import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { ShieldCheck, Zap, BadgeCheck, CreditCard } from 'lucide-react';

const trustSignals = [
  { icon: BadgeCheck, label: 'Verified Sellers', description: 'Every creator is vetted' },
  { icon: Zap, label: 'Instant Delivery', description: 'Download immediately' },
  { icon: CreditCard, label: 'Secure Payments', description: 'Encrypted checkout' },
  { icon: ShieldCheck, label: '3-Day Buyer Protection', description: 'Escrow on every sale' },
];

export function TrustBar() {
  return (
    <section className="px-4 sm:px-6 lg:px-[5%] py-4">
      <ScrollReveal direction="up" distance={12} duration={0.3}>
        <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex items-center gap-2">
              <signal.icon className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-none">{signal.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
