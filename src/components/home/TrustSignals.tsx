import { Shield, Zap, Headphones, RefreshCw } from 'lucide-react';

const signals = [
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Protected by Stripe, PayPal & Klarna with full encryption',
  },
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Download your assets immediately after purchase',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Live chat and ticket support whenever you need help',
  },
  {
    icon: RefreshCw,
    title: 'Free Updates',
    description: 'Lifetime updates included with every purchase',
  },
];

export function TrustSignals() {
  return (
    <section className="py-16 border-y border-border bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {signals.map((signal) => (
            <div key={signal.title} className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <signal.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-1">{signal.title}</h3>
                <p className="text-sm text-muted-foreground">{signal.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
