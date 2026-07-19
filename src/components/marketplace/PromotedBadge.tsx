import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromotedBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function PromotedBadge({ className, size = 'sm' }: PromotedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold uppercase tracking-wider',
        size === 'sm' && 'px-1.5 py-0.5 text-[9px]',
        size === 'md' && 'px-2 py-0.5 text-[10px]',
        className
      )}
    >
      <Megaphone className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      Promoted
    </span>
  );
}
