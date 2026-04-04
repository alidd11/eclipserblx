import { Shield, Zap, BadgeCheck, RefreshCw } from 'lucide-react';

interface StoreTrustSignalsProps {
  accentColor: string;
  isVerified?: boolean;
}

export function StoreTrustSignals({ 
  accentColor, 
  isVerified = false,
}: StoreTrustSignalsProps) {
  const signals = [
    {
      icon: Shield,
      title: 'Buyer Protection',
      description: '3-day refund guarantee',
    },
    {
      icon: Zap,
      title: 'Instant Delivery',
      description: 'Download immediately',
    },
    ...(isVerified ? [{
      icon: BadgeCheck,
      title: 'Verified Seller',
      description: 'Identity verified',
    }] : []),
    {
      icon: RefreshCw,
      title: 'Free Updates',
      description: 'Lifetime access',
    },
  ];

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {signals.map((signal) => (
          <div
            key={signal.title}
            className="group flex flex-col items-center text-center p-3.5 rounded-xl border border-border/50 bg-card hover:border-border transition-all duration-200 overflow-hidden relative"
          >
            {/* Subtle gradient bg */}
            <div 
              className="absolute inset-0 opacity-[0.06] rounded-xl"
              style={{ background: `radial-gradient(circle at 50% 0%, ${accentColor}, transparent 70%)` }}
            />
            <div className="relative">
              <div 
                className="p-2.5 rounded-lg mb-2.5 border border-border/30"
                style={{ backgroundColor: `${accentColor}10` }}
              >
                <signal.icon 
                  className="h-4 w-4"
                  style={{ color: accentColor }}
                />
              </div>
              <h4 className="font-semibold text-xs mb-0.5">{signal.title}</h4>
              <p className="text-[10px] text-muted-foreground leading-tight">{signal.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
