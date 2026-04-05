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
    { icon: Shield, label: 'Buyer Protection' },
    { icon: Zap, label: 'Instant Delivery' },
    ...(isVerified ? [{ icon: BadgeCheck, label: 'Verified Seller' }] : []),
    { icon: RefreshCw, label: 'Free Updates' },
  ];

  return (
    <div className="w-full py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {signals.map((signal, i) => (
          <div key={signal.label} className="flex items-center gap-1.5">
            <signal.icon
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{ color: accentColor }}
            />
            <span className="text-[11px] text-foreground/50 font-medium whitespace-nowrap">
              {signal.label}
            </span>
            {i < signals.length - 1 && (
              <span className="hidden sm:block h-3 w-px bg-border/40 ml-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
