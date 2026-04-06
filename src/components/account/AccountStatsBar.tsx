import { Package, Wallet, Calendar } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { useCurrency } from '@/hooks/useCurrency';

interface AccountStatsBarProps {
  totalOrders: number;
  totalSpent: number;
  memberSince: string;
  isLoading?: boolean;
}

export function AccountStatsBar({ totalOrders, totalSpent, memberSince, isLoading }: AccountStatsBarProps) {
  const { formatPrice } = useCurrency();
  const memberDuration = formatDistanceToNow(new Date(memberSince), { addSuffix: false });

  const stats = [
    { label: 'Orders', value: isLoading ? '–' : String(totalOrders), icon: Package },
    { label: 'Spent', value: isLoading ? '–' : formatPrice(totalSpent), icon: Wallet },
    { label: 'Member', value: memberDuration, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 border border-border/40"
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}
