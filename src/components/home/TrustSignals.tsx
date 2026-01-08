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
    <section className="pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Card Container - matching other cards */}
        <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-amber-500/5 p-6 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
          {/* Animated background glow */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/15 rounded-full blur-3xl opacity-50" />
          
          {/* Scanline effect */}
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />

          <div className="relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {signals.map((signal, index) => {
                const colors = [
                  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' },
                  { bg: 'bg-violet-500/20', text: 'text-violet-400', glow: 'shadow-violet-500/30' },
                  { bg: 'bg-blue-500/20', text: 'text-blue-400', glow: 'shadow-blue-500/30' },
                  { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
                ][index];
                
                return (
                  <div key={signal.title} className="text-center p-3">
                    <div className={`mx-auto w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shadow-lg ${colors.glow} border border-white/10 mb-3`}>
                      <signal.icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1">{signal.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
