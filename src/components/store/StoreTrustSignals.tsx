import { Shield, Zap, BadgeCheck, RefreshCw } from 'lucide-react';

interface StoreTrustSignalsProps {
  accentColor: string;
  isVerified?: boolean;
  isTrusted?: boolean;
}

export function StoreTrustSignals({ 
  accentColor, 
  isVerified = false,
  isTrusted = false 
}: StoreTrustSignalsProps) {
  const signals = [
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Protected by Stripe',
    },
    {
      icon: Zap,
      title: 'Instant Delivery',
      description: 'Download immediately',
    },
    ...(isVerified || isTrusted ? [{
      icon: BadgeCheck,
      title: isTrusted ? 'Trusted Seller' : 'Verified Seller',
      description: isTrusted ? 'Proven track record' : 'Identity confirmed',
    }] : []),
    {
      icon: RefreshCw,
      title: 'Free Updates',
      description: 'Lifetime access',
    },
  ];

  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {signals.map((signal) => (
          <div
            key={signal.title}
            className="flex flex-col items-center text-center p-4 rounded-xl border bg-card/50 backdrop-blur-sm transition-all hover:shadow-md"
            style={{ borderColor: `${accentColor}20` }}
          >
            <div 
              className="p-3 rounded-full mb-3"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <signal.icon 
                className="h-5 w-5"
                style={{ color: accentColor }}
              />
            </div>
            <h4 className="font-semibold text-sm mb-1">{signal.title}</h4>
            <p className="text-xs text-muted-foreground">{signal.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
