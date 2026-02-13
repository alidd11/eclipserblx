import { Shield, Zap, Headphones, RefreshCw } from 'lucide-react';
import { SectionWrapper } from './SectionWrapper';

const signals = [
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Protected by Stripe with full encryption',
  },
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Download in seconds, no waiting',
  },
  {
    icon: Headphones,
    title: 'Fast Support',
    description: 'Mon-Sat, 9AM-7PM via chat & tickets',
  },
  {
    icon: RefreshCw,
    title: 'Free Updates',
    description: 'Lifetime updates included',
  },
];

export function TrustSignals() {
  return (
    <SectionWrapper>
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Shield className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Why creators choose us</h2>
            <p className="text-sm text-muted-foreground">Trusted by the Roblox community</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {signals.map((signal) => (
            <div key={signal.title} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <signal.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{signal.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
