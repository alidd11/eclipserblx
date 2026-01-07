import {
  ShoppingBag,
  ShoppingCart,
  Zap,
  DollarSign,
  Crown,
  MessageSquare,
  MessagesSquare,
  Users,
  FileText,
  CheckCircle,
  Star,
  Stars,
  UserPlus,
  Award,
  Trophy,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  ShoppingCart,
  Zap,
  DollarSign,
  Crown,
  MessageSquare,
  MessagesSquare,
  Users,
  FileText,
  CheckCircle,
  Star,
  Stars,
  UserPlus,
  Award,
  Trophy,
};

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-500 bg-emerald-500/10',
  blue: 'text-blue-500 bg-blue-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  amber: 'text-amber-500 bg-amber-500/10',
  yellow: 'text-yellow-500 bg-yellow-500/10',
  cyan: 'text-cyan-500 bg-cyan-500/10',
  teal: 'text-teal-500 bg-teal-500/10',
  indigo: 'text-indigo-500 bg-indigo-500/10',
  sky: 'text-sky-500 bg-sky-500/10',
  green: 'text-green-500 bg-green-500/10',
  orange: 'text-orange-500 bg-orange-500/10',
  rose: 'text-rose-500 bg-rose-500/10',
  slate: 'text-slate-500 bg-slate-500/10',
  violet: 'text-violet-500 bg-violet-500/10',
  primary: 'text-primary bg-primary/10',
};

interface BadgeIconProps {
  icon: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  earned?: boolean;
  className?: string;
}

export function BadgeIcon({ icon, color, size = 'md', earned = true, className }: BadgeIconProps) {
  const Icon = iconMap[icon] || Award;
  const colorClass = colorMap[color] || colorMap.primary;

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-14 h-14 p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center transition-all',
        sizeClasses[size],
        earned ? colorClass : 'text-muted-foreground/50 bg-muted',
        earned && 'ring-2 ring-offset-2 ring-offset-background',
        earned && color === 'emerald' && 'ring-emerald-500/30',
        earned && color === 'blue' && 'ring-blue-500/30',
        earned && color === 'purple' && 'ring-purple-500/30',
        earned && color === 'amber' && 'ring-amber-500/30',
        earned && color === 'yellow' && 'ring-yellow-500/30',
        earned && color === 'cyan' && 'ring-cyan-500/30',
        earned && color === 'teal' && 'ring-teal-500/30',
        earned && color === 'indigo' && 'ring-indigo-500/30',
        earned && color === 'sky' && 'ring-sky-500/30',
        earned && color === 'green' && 'ring-green-500/30',
        earned && color === 'orange' && 'ring-orange-500/30',
        earned && color === 'rose' && 'ring-rose-500/30',
        earned && color === 'slate' && 'ring-slate-500/30',
        earned && color === 'violet' && 'ring-violet-500/30',
        !earned && 'opacity-40 grayscale',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}
