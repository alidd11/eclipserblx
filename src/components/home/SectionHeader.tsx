import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  count?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export function SectionHeader({ icon, title, count, viewAllHref, viewAllLabel = 'View all', className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 mb-3", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-sm sm:text-base font-display font-bold truncate">{title}</h2>
        {typeof count === 'number' && count > 0 && (
          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="shrink-0 flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          {viewAllLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
